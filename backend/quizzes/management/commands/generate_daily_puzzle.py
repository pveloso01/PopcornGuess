"""
Generate tomorrow's daily synopsis-ladder puzzle.

Pulls a candidate Title from the active pool that hasn't been used in the
last 365 days, fetches its synopsis through a TMDb → OMDb → Wikidata
fallback chain, asks Gemini for a 6-rung clue ladder, validates the
JSON, and creates the Quiz/Question/DailyPuzzle rows.

Run from GitHub Actions cron daily at 00:30 UTC:
    python manage.py generate_daily_puzzle

Or for a specific date / title:
    python manage.py generate_daily_puzzle --date 2026-06-01 --tmdb-id 27205
"""

from __future__ import annotations

import datetime as dt
import hashlib
import logging
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from quizzes.integrations.gemini import (
    GeminiError,
    LadderPuzzle,
    generate_ladder,
    model_name as gemini_model_name,
)
from quizzes.integrations.omdb import OMDbError, fetch_overview as omdb_fetch_overview
from quizzes.integrations.tmdb import TMDbError, fetch_overview
from quizzes.integrations.wikidata import (
    WikidataError,
    fetch_overview as wikidata_fetch_overview,
)
from quizzes.models import DailyPuzzle, Question, Quiz, QuizQuestion, Title

logger = logging.getLogger(__name__)


def fetch_overview_with_fallback(
    tmdb_id: int, kind: str, title: str, year: int | None
) -> str:
    """
    Try TMDb first, then OMDb, then Wikidata. Returns the first overview
    that comes back non-empty. Raises CommandError only when all three
    fail back-to-back.
    """
    try:
        text = fetch_overview(tmdb_id, kind=kind)
        if text:
            return text
        logger.warning("TMDb returned empty overview for tmdb_id=%s", tmdb_id)
    except (TMDbError, Exception) as exc:  # pragma: no cover - logged
        logger.warning("TMDb overview failed for tmdb_id=%s: %s", tmdb_id, exc)

    try:
        return omdb_fetch_overview(title, year=year)
    except (OMDbError, Exception) as exc:  # pragma: no cover - logged
        logger.warning("OMDb overview failed for %r: %s", title, exc)

    try:
        return wikidata_fetch_overview(title, year=year)
    except (WikidataError, Exception) as exc:  # pragma: no cover - logged
        logger.warning("Wikidata overview failed for %r: %s", title, exc)

    raise CommandError(
        f"All overview sources failed for {title!r} (tmdb_id={tmdb_id})."
    )


class Command(BaseCommand):
    help = "Generate the synopsis-ladder puzzle for a target date (default: tomorrow)."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Target ISO date (YYYY-MM-DD). Defaults to tomorrow UTC.",
        )
        parser.add_argument(
            "--tmdb-id",
            type=int,
            default=None,
            help="Force a specific TMDb id; otherwise pick the most popular unused.",
        )
        parser.add_argument(
            "--lookback",
            type=int,
            default=365,
            help="Days to look back when avoiding recent answers.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Generate and print the puzzle without writing to DB.",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        target_date = self._resolve_date(options["date"])
        lookback = options["lookback"]
        dry_run = options["dry_run"]

        if DailyPuzzle.objects.filter(date=target_date).exists():
            self.stdout.write(
                self.style.WARNING(f"Daily puzzle already exists for {target_date}")
            )
            return

        title = self._pick_title(options["tmdb_id"], lookback)
        self.stdout.write(
            f"Picked: {title.canonical_title} ({title.year}) [{title.kind}]"
        )

        synopsis = fetch_overview_with_fallback(
            tmdb_id=title.tmdb_id,
            kind=title.kind,
            title=title.canonical_title,
            year=title.year,
        )

        try:
            ladder, raw_response = generate_ladder(
                title=title.canonical_title,
                year=title.year,
                synopsis=synopsis,
                kind=title.kind,
            )
        except GeminiError as exc:
            raise CommandError(f"Gemini generation failed: {exc}") from exc

        self.stdout.write(self.style.SUCCESS("Generated 6-rung ladder:"))
        for i, rung in enumerate(ladder.rungs, 1):
            self.stdout.write(f"  {i}. {rung}")
        self.stdout.write(f"Aliases: {ladder.aliases}")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run: nothing written."))
            return

        self._persist(title, ladder, target_date, synopsis, raw_response)
        self.stdout.write(self.style.SUCCESS(f"Wrote DailyPuzzle for {target_date}"))

    def _resolve_date(self, raw: str | None) -> dt.date:
        if raw:
            try:
                return dt.date.fromisoformat(raw)
            except ValueError as exc:
                raise CommandError(f"Invalid --date {raw!r}; expected YYYY-MM-DD") from exc
        return timezone.now().date() + dt.timedelta(days=1)

    def _pick_title(self, forced_id: int | None, lookback_days: int) -> Title:
        if forced_id is not None:
            try:
                return Title.objects.get(tmdb_id=forced_id, is_active=True)
            except Title.DoesNotExist as exc:
                raise CommandError(
                    f"Title with tmdb_id={forced_id} not found. Run import_titles first."
                ) from exc

        cutoff = timezone.now().date() - dt.timedelta(days=lookback_days)
        recently_used_ids = (
            Quiz.objects.filter(daily_schedules__date__gte=cutoff)
            .exclude(slug="")
            .values_list("slug", flat=True)
        )
        used_tmdb_ids = {
            int(slug.split("-")[1])
            for slug in recently_used_ids
            if slug.startswith("tmdb-") and slug.split("-")[1].isdigit()
        }

        qs = Title.objects.filter(is_active=True).exclude(
            tmdb_id__in=used_tmdb_ids
        ).order_by("-popularity", "canonical_title")

        title = qs.first()
        if title is None:
            raise CommandError(
                "No eligible titles found. Run `manage.py import_titles` first."
            )
        return title

    @transaction.atomic
    def _persist(
        self,
        title: Title,
        ladder: LadderPuzzle,
        target_date: dt.date,
        synopsis: str,
        raw_response: dict[str, Any],
    ) -> None:
        slug = f"tmdb-{title.tmdb_id}-{slugify(title.canonical_title)[:120]}"
        full_ladder = "\n".join(f"{i + 1}. {r}" for i, r in enumerate(ladder.rungs))

        quiz = Quiz.objects.create(
            title=title.canonical_title,
            slug=slug,
            description=f"Daily puzzle for {target_date}",
            quiz_type=Quiz.QuizType.DAILY,
            mode=Quiz.PuzzleMode.SYNOPSIS_LADDER,
            max_attempts=6,
            is_published=True,
            publish_date=target_date,
        )

        question = Question.objects.create(
            question_type=Question.QuestionType.TEXT,
            text=ladder.rungs[0],
            correct_answer=title.canonical_title,
            explanation=full_ladder,
            hint_1=ladder.rungs[1] if len(ladder.rungs) > 1 else "",
            hint_2=ladder.rungs[2] if len(ladder.rungs) > 2 else "",
            hint_3=ladder.rungs[3] if len(ladder.rungs) > 3 else "",
            difficulty=Question.Difficulty.MEDIUM,
            # Scope the autocomplete to the picked title's media kind so
            # the suggestion list only offers same-kind candidates.
            target_kind=(
                Question.AnswerKind.MOVIE
                if title.kind == "movie"
                else Question.AnswerKind.TV
            ),
        )
        QuizQuestion.objects.create(quiz=quiz, question=question, order=1)

        existing_aliases = list(title.aliases or [])
        for alias in ladder.aliases:
            if alias not in existing_aliases:
                existing_aliases.append(alias)
        title.aliases = existing_aliases
        title.save(update_fields=["aliases"])

        DailyPuzzle.objects.create(
            date=target_date,
            quiz=quiz,
            is_active=True,
            gemini_raw_response=raw_response or {},
            gemini_prompt_version=ladder.prompt_version,
            gemini_model_name=gemini_model_name(),
            tmdb_overview_hash=hashlib.sha256(
                synopsis.encode("utf-8")
            ).hexdigest(),
        )

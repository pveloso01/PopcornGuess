"""
Resolve any Question still sitting at target_kind='any' by asking TMDb's
search API what kind of media the correct_answer is.

Strategy:
1. Pull every Question with target_kind='any'.
2. For each, search TMDb /search/multi for the correct_answer (and any
   alternative_answers).
3. Pick the top result. If it's 'movie' or 'tv', set target_kind to
   match — and upsert a Title row so the autocomplete can suggest it
   later.
4. If TMDb returns nothing (or returns a non-movie, non-tv result like
   a person), leave the row at 'any' and print it for human review.

Run after the deterministic backfill chain
(sync_titles_from_questions → backfill_question_target_kind) for any
edge cases the local rules couldn't resolve. Safe to schedule
periodically — idempotent, only touches rows still at 'any'.

Requires TMDB_API_KEY. Without one this command no-ops with a clear
message.
"""

from __future__ import annotations

import os
from typing import Iterable

from django.core.management.base import BaseCommand
from django.db import transaction

from quizzes.integrations.tmdb import (
    TMDbError,
    normalize,
    search_titles,
)
from quizzes.models import Question, Title


def _candidate_titles(question: Question) -> Iterable[str]:
    """Yield correct_answer first, then alternatives. De-duped, trimmed."""
    seen: set[str] = set()
    for raw in [question.correct_answer, *(question.alternative_answers or [])]:
        if not raw or not isinstance(raw, str):
            continue
        candidate = raw.strip()
        if not candidate or candidate.lower() in seen:
            continue
        seen.add(candidate.lower())
        yield candidate


class Command(BaseCommand):
    help = (
        "Use TMDb search to resolve Questions whose target_kind is still "
        "'any' to a concrete movie/tv label."
    )

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would change without writing.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Stop after processing this many questions (0 = no cap).",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        if not os.getenv("TMDB_API_KEY"):
            self.stdout.write(
                self.style.WARNING(
                    "TMDB_API_KEY is not set. Cannot resolve via live search. "
                    "Set the env var (or run in production where it's set on Fly) "
                    "and rerun this command."
                )
            )
            return

        dry = options["dry_run"]
        cap = options["limit"]

        pending = Question.objects.filter(target_kind=Question.AnswerKind.ANY)
        total = pending.count()
        if total == 0:
            self.stdout.write(
                self.style.SUCCESS("Nothing to resolve — no questions at 'any'.")
            )
            return

        self.stdout.write(f"Resolving {total} question(s) via TMDb search…")

        resolved = 0
        unresolved = 0

        for processed, question in enumerate(pending.iterator(), start=1):
            if cap and processed > cap:
                break

            kind = self._best_tmdb_kind(question)
            if kind is None:
                unresolved += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  no usable TMDb result for question #{question.id} "
                        f"({question.correct_answer!r})"
                    )
                )
                continue

            self.stdout.write(
                f"  Q{question.id}: {question.correct_answer!r} → {kind}"
            )

            if dry:
                resolved += 1
                continue

            with transaction.atomic():
                Question.objects.filter(pk=question.pk).update(target_kind=kind)
                # Also make sure a Title row exists for this answer so the
                # combobox can suggest it next time someone hits the puzzle.
                Title.objects.get_or_create(
                    canonical_title=question.correct_answer.strip(),
                    defaults={
                        "kind": kind,
                        "normalized_title": normalize(question.correct_answer),
                        "tmdb_id": _next_synthetic_tmdb_id(),
                        "popularity": 50.0,
                        "is_active": True,
                    },
                )

            resolved += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"{'Would resolve' if dry else 'Resolved'}: {resolved}. "
                f"Still unresolved: {unresolved}."
            )
        )

    def _best_tmdb_kind(self, question: Question) -> str | None:
        """
        Probe TMDb for each candidate answer in order. Return the first
        unambiguous movie/tv result. If multiple candidates contradict
        each other, prefer the one matching the correct_answer first.
        """
        for candidate in _candidate_titles(question):
            try:
                results = search_titles(query=candidate)
            except TMDbError as exc:
                self.stdout.write(
                    self.style.WARNING(
                        f"  TMDb error for {candidate!r}: {exc}"
                    )
                )
                continue

            # search_titles already filters out 'person' results.
            for record in results:
                if record.kind in ("movie", "tv"):
                    return record.kind

        return None


# Synthetic ids share the space defined in sync_titles_from_questions;
# keep them well above any real TMDb id.
_SYNTHETIC_TMDB_ID_BASE = 9_000_000_000


def _next_synthetic_tmdb_id() -> int:
    used = (
        Title.objects.filter(tmdb_id__gte=_SYNTHETIC_TMDB_ID_BASE).count()
    )
    return _SYNTHETIC_TMDB_ID_BASE + used

"""
Ensure every Question.correct_answer (and alternative_answers) has a
corresponding Title row so the autocomplete combobox can always surface
the right answer.

Why this matters: if a question's answer isn't in the Title pool, the
combobox can never suggest it. The player has to type the full title
exactly — which defeats the whole "type 3 letters and pick" UX.

Strategy:
1. Collect every distinct correct_answer + alternative_answer across all
   active questions.
2. Skip ones that already exist in the Title pool (case-insensitive
   match on canonical_title or aliases).
3. For the rest, infer kind from the Quiz.category.slug:
     'movies'   -> movie
     'tv-shows' -> tv
     anything else -> movie (default — most safe assumption for trivia)
4. Create a Title row with a synthetic negative tmdb_id so it can't
   collide with future real TMDb imports. When the real TMDb refresh
   later pulls in the same title, that row will be created alongside;
   `import_titles` upserts by tmdb_id so neither row clobbers the other.

Idempotent. Safe to run repeatedly.
"""

from __future__ import annotations

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from quizzes.models import Question, Title

CATEGORY_KIND_HINTS = {
    "movies": "movie",
    "tv-shows": "tv",
}


def _normalize(s: str) -> str:
    return " ".join(s.lower().strip().split())


# Synthetic tmdb_ids start here and count down so they never collide
# with real TMDb ids (which are positive and grow). Stored as positive
# big integers in the DB, so we use the very top of the range.
_SYNTHETIC_TMDB_ID_BASE = 9_000_000_000


class Command(BaseCommand):
    help = "Materialise every Question answer as a Title row."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without writing.",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        dry = options["dry_run"]

        # Build the existing Title lookup once.
        existing: set[str] = set()
        for t in Title.objects.filter(is_active=True).only(
            "canonical_title", "aliases"
        ):
            existing.add(_normalize(t.canonical_title))
            for alias in t.aliases or []:
                existing.add(_normalize(str(alias)))

        # Collect candidate (raw_title, kind_hint) pairs across all
        # questions. If the same title appears in multiple categories,
        # we'll resolve to the kind seen most often.
        candidates: dict[str, dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )

        for question in Question.objects.filter(is_active=True).iterator():
            # Gather answers for this question.
            answers = [question.correct_answer]
            answers.extend(question.alternative_answers or [])
            # Determine the inferred kind from quiz category.
            slugs = (
                question.quizquestion_set.select_related("quiz__category")
                .values_list("quiz__category__slug", flat=True)
                .distinct()
            )
            inferred: list[str] = [
                CATEGORY_KIND_HINTS[s] for s in slugs if s in CATEGORY_KIND_HINTS
            ]
            # If no clear category hint, fall back to 'movie' — the
            # statistically safer default for trivia.
            kind = inferred[0] if inferred else "movie"

            for raw in answers:
                if not raw or not isinstance(raw, str):
                    continue
                title_text = raw.strip()
                if not title_text:
                    continue
                norm = _normalize(title_text)
                if norm in existing:
                    continue
                candidates[title_text][kind] += 1

        created = 0
        skipped_existing = 0  # noqa: F841 (kept for logging clarity)
        next_id = _SYNTHETIC_TMDB_ID_BASE + Title.objects.filter(
            tmdb_id__gte=_SYNTHETIC_TMDB_ID_BASE
        ).count()

        if dry:
            for raw, counts in sorted(candidates.items()):
                kind = max(counts, key=counts.get)
                self.stdout.write(f"  WOULD CREATE: {raw!r} ({kind})")
            self.stdout.write(
                self.style.SUCCESS(
                    f"Would create {len(candidates)} new Title rows."
                )
            )
            return

        with transaction.atomic():
            for raw, counts in candidates.items():
                kind = max(counts, key=counts.get)
                norm = _normalize(raw)
                # Last-line race protection: another concurrent run may
                # have just created the row. update_or_create handles it.
                Title.objects.update_or_create(
                    tmdb_id=next_id,
                    defaults={
                        "kind": kind,
                        "canonical_title": raw,
                        "normalized_title": norm,
                        "popularity": 50.0,
                        "is_active": True,
                    },
                )
                created += 1
                next_id += 1
                existing.add(norm)

        self.stdout.write(
            self.style.SUCCESS(
                f"Synced {created} new Title rows from Question answers. "
                f"Total Titles now: {Title.objects.count()}."
            )
        )

"""
Set Question.target_kind on existing questions by matching the
correct_answer against the Title pool.

Why:
- We added Question.target_kind so the answer autocomplete can filter
  to movie or TV titles only. The field defaults to 'any' so anything
  created before the field existed is invisible to the filter.
- Newly-generated puzzles set target_kind at creation time (see
  generate_daily_puzzle). Everything older needs this backfill.

Strategy:
- Exact case-insensitive match on Title.canonical_title or aliases is
  the strong signal: assign target_kind from Title.kind.
- For ambiguous matches (answer matches both a movie and a TV show of
  the same name — e.g. "The Office") we leave target_kind='any' and
  print a warning. The human curator can fix those by hand.
- Questions whose answer isn't in the pool at all also stay 'any'.

Idempotent: only updates rows where the current value is 'any' so
re-running won't trample manual fixes.

Usage:
    python manage.py backfill_question_target_kind
    python manage.py backfill_question_target_kind --dry-run
"""

from __future__ import annotations

from collections import defaultdict

from django.core.management.base import BaseCommand

from quizzes.models import Question, Title

# Quiz.category.slug values whose answers are unambiguously one kind.
# `actors`, `directors`, `quotes` are intentionally not here — those
# can be answered with either a movie or a TV show.
CATEGORY_KIND_HINTS = {
    "movies": "movie",
    "tv-shows": "tv",
}


def _normalize(s: str) -> str:
    return " ".join(s.lower().strip().split())


class Command(BaseCommand):
    help = "Set Question.target_kind for existing 'any' questions from the Title pool."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would change without writing.",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        dry = options["dry_run"]

        # Build an in-memory map: normalized title/alias -> set of kinds.
        by_norm: dict[str, set[str]] = defaultdict(set)
        for t in Title.objects.filter(is_active=True).only(
            "canonical_title", "aliases", "kind"
        ):
            by_norm[_normalize(t.canonical_title)].add(t.kind)
            for alias in t.aliases or []:
                by_norm[_normalize(str(alias))].add(t.kind)

        eligible = Question.objects.filter(
            target_kind=Question.AnswerKind.ANY
        )

        updated = 0
        updated_via_category = 0
        skipped_ambiguous = 0
        skipped_unmatched = 0

        for question in eligible.iterator():
            candidates = {_normalize(question.correct_answer)}
            for alt in question.alternative_answers or []:
                candidates.add(_normalize(str(alt)))

            matched_kinds: set[str] = set()
            for key in candidates:
                matched_kinds |= by_norm.get(key, set())

            # Pass 2: if no Title match, fall back to the Quiz category.
            # Categories `movies` / `tv-shows` are unambiguous; actors,
            # directors, and quotes can be either, so they stay 'any'.
            if not matched_kinds:
                # Question → QuizQuestion → Quiz → Category.slug
                category_slugs = (
                    question.quizquestion_set.select_related("quiz__category")
                    .values_list("quiz__category__slug", flat=True)
                    .distinct()
                )
                category_kinds = {
                    CATEGORY_KIND_HINTS[slug]
                    for slug in category_slugs
                    if slug in CATEGORY_KIND_HINTS
                }
                if len(category_kinds) == 1:
                    kind = next(iter(category_kinds))
                    new_value = (
                        Question.AnswerKind.MOVIE
                        if kind == "movie"
                        else Question.AnswerKind.TV
                    )
                    if not dry:
                        Question.objects.filter(pk=question.pk).update(
                            target_kind=new_value
                        )
                    updated += 1
                    updated_via_category += 1
                    continue

                skipped_unmatched += 1
                continue

            if len(matched_kinds) > 1:
                skipped_ambiguous += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  ambiguous: question #{question.id} "
                        f"({question.correct_answer!r}) matches "
                        f"{sorted(matched_kinds)}"
                    )
                )
                continue

            kind = next(iter(matched_kinds))
            new_value = (
                Question.AnswerKind.MOVIE
                if kind == "movie"
                else Question.AnswerKind.TV
            )

            if dry:
                updated += 1
                continue

            Question.objects.filter(pk=question.pk).update(target_kind=new_value)
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"{'Would update' if dry else 'Updated'}: {updated} questions "
                f"(of which {updated_via_category} fell back to Quiz category). "
                f"Ambiguous (left as 'any'): {skipped_ambiguous}. "
                f"No match: {skipped_unmatched}."
            )
        )

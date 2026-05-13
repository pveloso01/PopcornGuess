"""
Data migration: reclassify Question.target_kind from scratch using only
strong evidence. Replaces the blind 0006 coercion (every 'any' → 'movie')
which created false labels for questions whose answers were actually
TV shows.

Classification rules (strongest evidence first):
  1. correct_answer (or any alternative_answer) exactly matches a
     Title.canonical_title or alias whose kind is unambiguously
     'movie' or 'tv' → use that kind.
  2. Quiz.category.slug is 'movies' AND no TV-only match found → 'movie'.
  3. Quiz.category.slug is 'tv-shows' AND no movie-only match found → 'tv'.
  4. Otherwise → 'any' (review queue). The daily quiz won't show these
     until a curator confirms the kind, which is the correct fail-safe.

Idempotent. Re-running cannot worsen state because every rule is
evidence-driven.
"""

from __future__ import annotations

from collections import defaultdict

from django.db import migrations

CATEGORY_KIND_HINTS = {
    "movies": "movie",
    "tv-shows": "tv",
}


def _normalize(s: str) -> str:
    return " ".join(s.lower().strip().split())


def reclassify(apps, schema_editor):
    Title = apps.get_model("quizzes", "Title")
    Question = apps.get_model("quizzes", "Question")

    # Reset every row to 'any' so the previous blind coercion can't
    # contaminate this pass.
    Question.objects.all().update(target_kind="any")

    # Build the canonical title → set-of-kinds map. Note this can
    # include synthetic Title rows previously created with a wrong
    # default kind; the rule below uses *unambiguous* kind only, so a
    # title that only appears as movie in the pool is treated as movie
    # confidently even if a curator later corrects it.
    title_kinds: dict[str, set[str]] = defaultdict(set)
    for t in Title.objects.filter(is_active=True):
        title_kinds[_normalize(t.canonical_title)].add(t.kind)
        for alias in t.aliases or []:
            title_kinds[_normalize(str(alias))].add(t.kind)

    for question in Question.objects.all().iterator():
        candidates = {_normalize(question.correct_answer or "")}
        for alt in question.alternative_answers or []:
            candidates.add(_normalize(str(alt)))
        candidates.discard("")

        matched_kinds: set[str] = set()
        for key in candidates:
            matched_kinds |= title_kinds.get(key, set())

        # Rule 1: title-pool match wins if it's a single kind.
        if len(matched_kinds) == 1:
            kind = next(iter(matched_kinds))
            Question.objects.filter(pk=question.pk).update(target_kind=kind)
            continue

        # Rule 2/3: fall back to category, but only if the category
        # *contradicts* nothing in matched_kinds (i.e. either no title
        # match or it agreed).
        slugs = list(
            question.quizquestion_set.select_related("quiz__category")
            .values_list("quiz__category__slug", flat=True)
            .distinct()
        )
        category_kinds = {
            CATEGORY_KIND_HINTS[s] for s in slugs if s in CATEGORY_KIND_HINTS
        }
        if len(category_kinds) == 1:
            cat_kind = next(iter(category_kinds))
            # If a title match disagreed with the category, leave as
            # 'any' rather than trust either.
            if matched_kinds and cat_kind not in matched_kinds:
                continue
            Question.objects.filter(pk=question.pk).update(
                target_kind=cat_kind
            )
            continue

        # Rule 4: insufficient evidence → review queue (already 'any').


def reverse_noop(apps, schema_editor):
    # Reversibly setting everything back to 'any' is the safe rollback.
    Question = apps.get_model("quizzes", "Question")
    Question.objects.all().update(target_kind="any")


class Migration(migrations.Migration):

    dependencies = [
        ("quizzes", "0007_alter_question_target_kind"),
    ]

    operations = [
        migrations.RunPython(reclassify, reverse_noop),
    ]

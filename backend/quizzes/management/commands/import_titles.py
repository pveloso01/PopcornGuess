"""
Refresh the Title autocomplete pool from TMDb popular movies + TV shows.

Run via GitHub Actions (weekly) or locally:
    python manage.py import_titles --pages 10 --kinds movie,tv

Idempotent: existing rows update in place by tmdb_id.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from quizzes.integrations.tmdb import (
    TitleRecord,
    TMDbError,
    iter_popular_titles,
    normalize,
)
from quizzes.models import Title


class Command(BaseCommand):
    help = "Refresh the Title autocomplete pool from TMDb."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--pages",
            type=int,
            default=10,
            help="Number of TMDb pages per kind (20 titles per page).",
        )
        parser.add_argument(
            "--kinds",
            type=str,
            default="movie,tv",
            help="Comma-separated kinds to import (movie,tv).",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        pages: int = options["pages"]
        kinds: list[str] = [k.strip() for k in options["kinds"].split(",") if k.strip()]

        total_upserts = 0
        for kind in kinds:
            self.stdout.write(f"Importing {pages} pages of {kind}…")
            try:
                count = self._import_kind(kind, pages)
            except TMDbError as exc:
                raise CommandError(str(exc)) from exc
            total_upserts += count
            self.stdout.write(self.style.SUCCESS(f"  upserted {count} {kind} titles"))

        self.stdout.write(self.style.SUCCESS(f"Done. Total upserts: {total_upserts}"))

    def _import_kind(self, kind: str, pages: int) -> int:
        count = 0
        for record in iter_popular_titles(pages=pages, kind=kind):
            self._upsert(record)
            count += 1
        return count

    def _upsert(self, record: TitleRecord) -> None:
        Title.objects.update_or_create(
            tmdb_id=record.tmdb_id,
            defaults={
                "kind": record.kind,
                "canonical_title": record.title,
                "normalized_title": normalize(record.title),
                "year": record.year,
                "popularity": record.popularity,
                "is_active": True,
            },
        )

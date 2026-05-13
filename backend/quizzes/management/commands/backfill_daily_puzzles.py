"""
Pre-generate N days of daily puzzles in one shot.

Useful for content backstops (run during launch week to build a 90-day
buffer) and for filling holes after pipeline outages.

Skips dates that already have a DailyPuzzle row. Per-day failures are
logged and do not abort the entire backfill — the final summary reports
counts.
"""

from __future__ import annotations

import datetime as dt
import logging

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from quizzes.models import DailyPuzzle

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Generate multiple days of daily puzzles in a single run."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument("--days", type=int, default=90)
        parser.add_argument(
            "--start",
            type=str,
            default=None,
            help="Start date (YYYY-MM-DD). Defaults to tomorrow UTC.",
        )
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        days = int(options["days"])
        if days <= 0:
            raise CommandError("--days must be a positive integer")

        start = self._resolve_start(options["start"])
        dry_run = bool(options["dry_run"])

        succeeded = 0
        skipped = 0
        failed = 0

        for offset in range(days):
            target = start + dt.timedelta(days=offset)
            if DailyPuzzle.objects.filter(date=target).exists():
                self.stdout.write(f"[skip] {target} already exists")
                skipped += 1
                continue

            self.stdout.write(f"[gen]  {target}")
            try:
                args_list = ["--date", target.isoformat()]
                if dry_run:
                    args_list.append("--dry-run")
                call_command("generate_daily_puzzle", *args_list)
                succeeded += 1
            except Exception as exc:  # noqa: BLE001 — keep going on failure
                logger.exception("backfill failed for %s", target)
                self.stdout.write(self.style.ERROR(f"[fail] {target}: {exc}"))
                failed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Backfill complete: {succeeded} succeeded, "
                f"{skipped} skipped, {failed} failed."
            )
        )

    def _resolve_start(self, raw: str | None) -> dt.date:
        if raw:
            try:
                return dt.date.fromisoformat(raw)
            except ValueError as exc:
                raise CommandError(
                    f"Invalid --start {raw!r}; expected YYYY-MM-DD"
                ) from exc
        return timezone.now().date() + dt.timedelta(days=1)

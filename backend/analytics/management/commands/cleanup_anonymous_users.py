"""
Management command to cleanup old anonymous users.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from analytics.models import AnonymousUser


class Command(BaseCommand):
    help = "Cleanup anonymous users that haven't been active for a specified period"

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Delete anonymous users inactive for this many days (default: 90)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        days = options["days"]
        dry_run = options["dry_run"]

        cutoff_date = timezone.now() - timedelta(days=days)

        # Find anonymous users not linked to registered users and inactive
        old_users = AnonymousUser.objects.filter(
            user__isnull=True,  # Not migrated to registered user
            last_seen__lt=cutoff_date,  # Inactive
        )

        count = old_users.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY RUN: Would delete {count} anonymous users "
                    f"inactive for more than {days} days"
                )
            )
            if count > 0:
                self.stdout.write("Sample device IDs:")
                for user in old_users[:5]:
                    self.stdout.write(f"  - {user.device_id}")
        else:
            deleted_count, _ = old_users.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully deleted {deleted_count} anonymous users "
                    f"inactive for more than {days} days"
                )
            )

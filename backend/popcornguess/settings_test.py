"""Test settings for PopcornGuess backend."""

from .settings import *  # noqa: F403, F401

# Use SQLite for tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}


# Disable migrations for faster tests
class DisableMigrations:
    """Disable migrations for tests."""

    def __contains__(self, item: str) -> bool:
        """Return True for all items."""
        return True

    def __getitem__(self, item: str) -> None:
        """Return None for all items."""
        return None


MIGRATION_MODULES = DisableMigrations()

# Use faster password hasher for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

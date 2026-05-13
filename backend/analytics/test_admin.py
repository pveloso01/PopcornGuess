"""
Tests for analytics admin classes.

Exercises the custom display callables registered on the admin site —
they're untested by default since admin views require a logged-in
superuser. We instantiate each ModelAdmin directly off the registry and
invoke the display methods on synthetic objects.
"""

from __future__ import annotations

import pytest
from django.contrib import admin as django_admin
from django.contrib.auth import get_user_model

from .admin import (
    AnonymousUserAdmin,
    DailyQuizStatsAdmin,
    StreakAdmin,
    UserProgressAdmin,
    UserStatsAdmin,
)
from .models import AnonymousUser, DailyQuizStats, Streak, UserProgress, UserStats

User = get_user_model()


@pytest.mark.django_db
class TestAnonymousUserAdmin:
    def test_registered_on_admin_site(self) -> None:
        """AnonymousUserAdmin is registered for AnonymousUser."""
        assert isinstance(
            django_admin.site._registry[AnonymousUser], AnonymousUserAdmin
        )

    def test_device_id_short_truncates(self, make_anon) -> None:
        """device_id_short returns first 8 chars plus ellipsis."""
        anon = make_anon()
        admin_obj = django_admin.site._registry[AnonymousUser]
        result = admin_obj.device_id_short(anon)
        assert result.endswith("...")
        assert len(result) == 11  # 8 chars + "..."


@pytest.mark.django_db
class TestUserProgressAdmin:
    def test_get_user_display_with_registered_user(
        self, make_user, make_quiz
    ) -> None:
        """get_user_display returns username when user is set."""
        user = make_user(username="bob")
        quiz = make_quiz()
        progress = UserProgress.objects.create(
            user=user, quiz=quiz, total_questions=1
        )
        admin_obj = django_admin.site._registry[UserProgress]
        assert admin_obj.get_user_display(progress) == "bob"

    def test_get_user_display_with_anonymous(self, make_anon, make_quiz) -> None:
        """get_user_display returns Anon prefix when anonymous_user is set."""
        anon = make_anon()
        quiz = make_quiz()
        progress = UserProgress.objects.create(
            anonymous_user=anon, quiz=quiz, total_questions=1
        )
        admin_obj = django_admin.site._registry[UserProgress]
        result = admin_obj.get_user_display(progress)
        assert result.startswith("Anon: ")

    def test_get_user_display_unknown(self) -> None:
        """get_user_display returns 'Unknown' when neither is set."""
        admin_obj = django_admin.site._registry[UserProgress]
        # Build an unsaved instance so the check-constraint isn't tripped.
        progress = UserProgress(user=None, anonymous_user=None)
        assert admin_obj.get_user_display(progress) == "Unknown"

    def test_percentage_display_formats(self, make_user, make_quiz) -> None:
        """percentage_display returns a formatted percentage string."""
        user = make_user()
        quiz = make_quiz()
        progress = UserProgress.objects.create(
            user=user, quiz=quiz, score=3, total_questions=4
        )
        admin_obj = django_admin.site._registry[UserProgress]
        assert admin_obj.percentage_display(progress) == "75.0%"


@pytest.mark.django_db
class TestStreakAdmin:
    def test_get_user_display_with_user(self, make_user) -> None:
        """StreakAdmin.get_user_display returns username for registered users."""
        user = make_user(username="alice")
        streak = Streak.objects.create(user=user)
        admin_obj = django_admin.site._registry[Streak]
        assert admin_obj.get_user_display(streak) == "alice"

    def test_get_user_display_with_anon(self, make_anon) -> None:
        """StreakAdmin.get_user_display returns Anon: prefix for anon users."""
        anon = make_anon()
        streak = anon.streak  # created by fixture
        admin_obj = django_admin.site._registry[Streak]
        assert admin_obj.get_user_display(streak).startswith("Anon: ")

    def test_get_user_display_unknown(self) -> None:
        """StreakAdmin.get_user_display returns 'Unknown' when neither is set."""
        admin_obj = django_admin.site._registry[Streak]
        streak = Streak(user=None, anonymous_user=None)
        assert admin_obj.get_user_display(streak) == "Unknown"


@pytest.mark.django_db
class TestUserStatsAdmin:
    def test_get_user_display_with_user(self, make_user) -> None:
        user = make_user(username="charlie")
        stats = UserStats.objects.create(user=user)
        admin_obj = django_admin.site._registry[UserStats]
        assert admin_obj.get_user_display(stats) == "charlie"

    def test_get_user_display_with_anon(self, make_anon) -> None:
        anon = make_anon()
        stats = anon.stats  # created by fixture
        admin_obj = django_admin.site._registry[UserStats]
        assert admin_obj.get_user_display(stats).startswith("Anon: ")

    def test_get_user_display_unknown(self) -> None:
        admin_obj = django_admin.site._registry[UserStats]
        stats = UserStats(user=None, anonymous_user=None)
        assert admin_obj.get_user_display(stats) == "Unknown"

    def test_average_score_display(self, make_user) -> None:
        user = make_user()
        stats = UserStats.objects.create(user=user, average_score=42.4)
        admin_obj = django_admin.site._registry[UserStats]
        assert admin_obj.average_score_display(stats) == "42.4"

    def test_accuracy_display(self, make_user) -> None:
        user = make_user()
        stats = UserStats.objects.create(
            user=user,
            total_questions_answered=10,
            total_correct_answers=7,
        )
        admin_obj = django_admin.site._registry[UserStats]
        assert admin_obj.accuracy_display(stats) == "70.0%"


@pytest.mark.django_db
class TestDailyQuizStatsAdmin:
    def test_completion_rate_display(self, make_quiz) -> None:
        quiz = make_quiz()
        dqs = DailyQuizStats.objects.create(
            quiz=quiz,
            date=quiz.publish_date,
            total_attempts=10,
            total_completions=4,
        )
        admin_obj = django_admin.site._registry[DailyQuizStats]
        assert admin_obj.completion_rate_display(dqs) == "40.0%"

    def test_average_score_display(self, make_quiz) -> None:
        quiz = make_quiz()
        dqs = DailyQuizStats.objects.create(
            quiz=quiz,
            date=quiz.publish_date,
            average_score=88.5,
        )
        admin_obj = django_admin.site._registry[DailyQuizStats]
        assert admin_obj.average_score_display(dqs) == "88.5"

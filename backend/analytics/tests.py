"""
Test suite for the analytics app.

Covers:
- AnonymousUser endpoints (register, sync).
- Streak model behaviour (consecutive, skip, freeze, freeze-persistence regression).
- get_current_streak / update_streak views.
- get_user_stats view.
- start/submit/complete_quiz_session lifecycle.
- migrate_anonymous_to_user (the most complex new endpoint).
"""

from __future__ import annotations

import datetime as dt

import pytest
from django.contrib.auth import get_user_model
from freezegun import freeze_time
from rest_framework.test import APIClient

from .models import AnonymousUser, Streak, UserProgress, UserStats

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────
# Streak model — the persistence-bug regression lives here.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestStreakModel:
    @pytest.fixture
    def streak(self, make_user):
        user = make_user()
        return Streak.objects.create(user=user)

    def test_first_play_sets_streak_to_1(self, streak) -> None:
        with freeze_time("2026-05-01"):
            streak.update_streak()
        assert streak.current_streak == 1
        assert streak.best_streak == 1

    def test_consecutive_day_extends_streak(self, streak) -> None:
        with freeze_time("2026-05-01"):
            streak.update_streak()
        with freeze_time("2026-05-02"):
            streak.update_streak()
        streak.refresh_from_db()
        assert streak.current_streak == 2
        assert streak.best_streak == 2

    def test_skip_day_resets_streak(self, streak) -> None:
        with freeze_time("2026-05-01"):
            streak.update_streak()
        with freeze_time("2026-05-05"):
            extended = streak.update_streak()
        streak.refresh_from_db()
        assert extended is False
        assert streak.current_streak == 1

    def test_same_day_idempotent(self, streak) -> None:
        with freeze_time("2026-05-01"):
            streak.update_streak()
            streak.update_streak()
        streak.refresh_from_db()
        assert streak.current_streak == 1

    def test_streak_freeze_protects_one_missed_day(self, streak) -> None:
        streak.streak_freezes_available = 1
        streak.streak_freezes_earned = 1
        streak.save()
        with freeze_time("2026-05-01"):
            streak.update_streak()
        with freeze_time("2026-05-03"):  # missed one day
            streak.update_streak()
        streak.refresh_from_db()
        assert streak.current_streak == 2
        # Persistence regression: freeze MUST be decremented in the DB.
        assert streak.streak_freezes_available == 0

    def test_use_streak_freeze_persists_after_reload(self, streak) -> None:
        # Direct test of the bug we fixed: _use_streak_freeze used to
        # mutate in-memory only.
        streak.streak_freezes_available = 2
        streak.save()
        streak._use_streak_freeze()
        fresh = Streak.objects.get(pk=streak.pk)
        assert fresh.streak_freezes_available == 1

    def test_use_freeze_when_none_available_is_noop(self, streak) -> None:
        streak.streak_freezes_available = 0
        streak.save()
        streak._use_streak_freeze()
        fresh = Streak.objects.get(pk=streak.pk)
        assert fresh.streak_freezes_available == 0

    def test_milestone_at_7_days_grants_freeze(self, streak) -> None:
        with freeze_time("2026-05-01") as frozen:
            streak.update_streak()
            for _ in range(6):
                frozen.tick(delta=dt.timedelta(days=1))
                streak.update_streak()
        streak.refresh_from_db()
        assert streak.current_streak == 7
        assert streak.streak_freezes_available >= 1


# ──────────────────────────────────────────────────────────────────────────
# Anonymous register / sync endpoints.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnonymousRegister:
    URL = "/api/v1/anonymous/register/"

    def test_creates_anon_with_streak_and_stats(self) -> None:
        response = APIClient().post(self.URL, {}, format="json")
        assert response.status_code == 201
        device_id = response.data["device_id"]
        anon = AnonymousUser.objects.get(device_id=device_id)
        assert Streak.objects.filter(anonymous_user=anon).exists()
        assert UserStats.objects.filter(anonymous_user=anon).exists()

    def test_accepts_timezone(self) -> None:
        response = APIClient().post(
            self.URL,
            {"timezone_name": "America/Sao_Paulo"},
            format="json",
        )
        anon = AnonymousUser.objects.get(device_id=response.data["device_id"])
        assert anon.timezone_name == "America/Sao_Paulo"


@pytest.mark.django_db
class TestAnonymousSync:
    URL = "/api/v1/anonymous/sync/"

    def test_returns_404_for_unknown_device(self) -> None:
        response = APIClient().post(
            self.URL,
            {"device_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code == 404

    def test_sync_returns_streak_stats_progress(self, make_anon) -> None:
        anon = make_anon()
        response = APIClient().post(
            self.URL, {"device_id": str(anon.device_id)}, format="json"
        )
        assert response.status_code == 200
        assert "streak" in response.data
        assert "stats" in response.data
        assert "progress" in response.data


# ──────────────────────────────────────────────────────────────────────────
# Streak views.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestStreakViews:
    def test_get_current_streak_anonymous_via_header(self, make_anon) -> None:
        anon = make_anon()
        response = APIClient().get(
            "/api/v1/streaks/current/",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert response.status_code == 200

    def test_get_current_streak_anonymous_via_query(self, make_anon) -> None:
        anon = make_anon()
        response = APIClient().get(
            f"/api/v1/streaks/current/?device_id={anon.device_id}"
        )
        assert response.status_code == 200

    def test_get_current_streak_authenticated(self, make_user) -> None:
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/v1/streaks/current/")
        assert response.status_code == 200

    def test_get_current_streak_anon_missing_device_400(self) -> None:
        response = APIClient().get("/api/v1/streaks/current/")
        assert response.status_code == 400

    def test_update_streak_anonymous_extends(self, make_anon) -> None:
        anon = make_anon()
        response = APIClient().post(
            "/api/v1/streaks/update/",
            {},
            format="json",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert response.status_code == 200
        assert response.data["streak_extended"] is True
        assert response.data["current_streak"] == 1


# ──────────────────────────────────────────────────────────────────────────
# Stats view.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestStatsView:
    def test_anonymous_stats(self, make_anon) -> None:
        anon = make_anon()
        response = APIClient().get(
            "/api/v1/stats/me/",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert response.status_code == 200

    def test_authenticated_stats(self, make_user) -> None:
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/v1/stats/me/")
        assert response.status_code == 200

    def test_anon_missing_device_400(self) -> None:
        response = APIClient().get("/api/v1/stats/me/")
        assert response.status_code == 400


# ──────────────────────────────────────────────────────────────────────────
# Quiz session lifecycle.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestProgressLifecycle:
    def test_full_lifecycle_anonymous(self, make_anon, make_quiz) -> None:
        anon = make_anon()
        quiz = make_quiz(questions=2)
        client = APIClient()

        start = client.post(
            "/api/v1/progress/start/",
            {"quiz_id": quiz.id},
            format="json",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert start.status_code == 201
        progress_id = start.data["id"]

        submit = client.post(
            "/api/v1/progress/submit/",
            {
                "progress_id": progress_id,
                "answer": {"is_correct": True, "value": "Inception"},
            },
            format="json",
        )
        assert submit.status_code == 200
        assert submit.data["score"] == 1

        complete = client.post(
            "/api/v1/progress/complete/",
            {"progress_id": progress_id, "time_taken_seconds": 42},
            format="json",
        )
        assert complete.status_code == 200
        assert complete.data["is_completed"] is True

    def test_start_missing_quiz_id_400(self, make_anon) -> None:
        anon = make_anon()
        response = APIClient().post(
            "/api/v1/progress/start/",
            {},
            format="json",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert response.status_code == 400

    def test_start_unknown_quiz_404(self, make_anon) -> None:
        anon = make_anon()
        response = APIClient().post(
            "/api/v1/progress/start/",
            {"quiz_id": 99_999_999},
            format="json",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert response.status_code == 404

    def test_submit_unknown_progress_404(self) -> None:
        response = APIClient().post(
            "/api/v1/progress/submit/",
            {"progress_id": 99_999_999, "answer": {"is_correct": False}},
            format="json",
        )
        assert response.status_code == 404


# ──────────────────────────────────────────────────────────────────────────
# Anonymous → authenticated migration.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestMigrateAnonymousToUser:
    URL = "/api/v1/anonymous/migrate/"

    def _client_for(self, user):
        c = APIClient()
        c.force_authenticate(user=user)
        return c

    def test_unauthenticated_returns_401_or_403(self) -> None:
        response = APIClient().post(self.URL, {"device_id": "any"}, format="json")
        assert response.status_code in (401, 403)

    def test_missing_device_id_returns_400(self, make_user) -> None:
        user = make_user()
        response = self._client_for(user).post(self.URL, {}, format="json")
        assert response.status_code == 400

    def test_unknown_device_returns_404(self, make_user) -> None:
        user = make_user()
        response = self._client_for(user).post(
            self.URL,
            {"device_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code == 404

    def test_happy_path_transfers_progress_and_streak(
        self, make_user, make_anon, make_quiz
    ) -> None:
        user = make_user()
        anon = make_anon()
        quiz = make_quiz()
        UserProgress.objects.create(
            anonymous_user=anon,
            quiz=quiz,
            total_questions=5,
            score=3,
        )
        anon_streak = anon.streak  # type: ignore[attr-defined]
        anon_streak.current_streak = 12
        anon_streak.best_streak = 20
        anon_streak.streak_freezes_available = 2
        anon_streak.streak_freezes_earned = 5
        anon_streak.save()

        response = self._client_for(user).post(
            self.URL, {"device_id": str(anon.device_id)}, format="json"
        )
        assert response.status_code == 200
        assert response.data["status"] == "migrated"

        assert UserProgress.objects.filter(user=user, quiz=quiz).exists()
        assert not UserProgress.objects.filter(anonymous_user=anon).exists()

        user_streak = Streak.objects.get(user=user)
        assert user_streak.current_streak == 12
        assert user_streak.best_streak == 20
        assert user_streak.streak_freezes_available == 2
        assert user_streak.streak_freezes_earned == 5

        assert not AnonymousUser.objects.filter(pk=anon.pk).exists()

    def test_merge_keeps_higher_streak(self, make_user, make_anon) -> None:
        user = make_user()
        user_streak = Streak.objects.create(
            user=user,
            current_streak=50,
            best_streak=80,
            streak_freezes_available=3,
        )
        anon = make_anon()
        anon_streak = anon.streak  # type: ignore[attr-defined]
        anon_streak.current_streak = 5
        anon_streak.best_streak = 5
        anon_streak.save()

        self._client_for(user).post(
            self.URL, {"device_id": str(anon.device_id)}, format="json"
        )
        user_streak.refresh_from_db()
        assert user_streak.current_streak == 50
        assert user_streak.best_streak == 80
        assert user_streak.streak_freezes_available == 3

    def test_idempotent_second_call_is_404(
        self, make_user, make_anon
    ) -> None:
        user = make_user()
        anon = make_anon()
        client = self._client_for(user)
        first = client.post(
            self.URL, {"device_id": str(anon.device_id)}, format="json"
        )
        assert first.status_code == 200
        second = client.post(
            self.URL, {"device_id": str(anon.device_id)}, format="json"
        )
        assert second.status_code == 404

"""
Tests for the quizzes management commands.

We mock the TMDb + Gemini integrations so these tests run offline.
"""

from __future__ import annotations

import datetime as dt
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from freezegun import freeze_time

from quizzes.integrations.gemini import GeminiError, LadderPuzzle
from quizzes.integrations.tmdb import TitleRecord
from quizzes.models import DailyPuzzle, Question, Quiz, Title  # noqa: F401


def _stub_ladder() -> LadderPuzzle:
    return LadderPuzzle(
        rungs=[
            "Rung one — broad theme.",
            "Rung two — slightly more specific clue.",
            "Rung three — character relationships.",
            "Rung four — an event in act two.",
            "Rung five — close to the synopsis line.",
            "Rung six — the synopsis paraphrased tightly.",
        ],
        aliases=["Sample Title", "Sample Title (2020)"],
    )


# ──────────────────────────────────────────────────────────────────────────
# import_titles
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestImportTitles:
    def test_upserts_titles(self) -> None:
        records = [
            TitleRecord(
                tmdb_id=10,
                kind="movie",
                title="Movie Ten",
                year=2020,
                overview="",
                popularity=50.0,
                aliases=(),
            ),
            TitleRecord(
                tmdb_id=11,
                kind="movie",
                title="Movie Eleven",
                year=2021,
                overview="",
                popularity=40.0,
                aliases=(),
            ),
        ]

        with patch(
            "quizzes.management.commands.import_titles.iter_popular_titles",
            return_value=iter(records),
        ):
            out = StringIO()
            call_command(
                "import_titles", "--pages", "1", "--kinds", "movie", stdout=out
            )

        assert Title.objects.count() == 2
        assert "upserted 2 movie" in out.getvalue()

    def test_idempotent_on_second_run(self) -> None:
        records = [
            TitleRecord(
                tmdb_id=10,
                kind="movie",
                title="Movie Ten",
                year=2020,
                overview="",
                popularity=50.0,
                aliases=(),
            ),
        ]

        with patch(
            "quizzes.management.commands.import_titles.iter_popular_titles",
            return_value=iter(records),
        ):
            call_command("import_titles", "--pages", "1", "--kinds", "movie")
        with patch(
            "quizzes.management.commands.import_titles.iter_popular_titles",
            return_value=iter(records),
        ):
            call_command("import_titles", "--pages", "1", "--kinds", "movie")

        assert Title.objects.count() == 1


# ──────────────────────────────────────────────────────────────────────────
# generate_daily_puzzle
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGenerateDailyPuzzle:
    @pytest.fixture
    def seed_title(self, make_title):
        return make_title(
            tmdb_id=999,
            canonical_title="Sample Title",
            normalized_title="sample title",
            year=2020,
            popularity=99,
        )

    def test_dry_run_writes_nothing(self, seed_title) -> None:
        with patch(
            "quizzes.management.commands.generate_daily_puzzle.fetch_overview",
            return_value="A long enough synopsis for the pre-check pass.",
        ), patch(
            "quizzes.management.commands.generate_daily_puzzle.generate_ladder",
            return_value=(_stub_ladder(), {"candidates": [{"raw": "stub"}]}),
        ), freeze_time("2026-05-15"):
            call_command("generate_daily_puzzle", "--dry-run")
        assert DailyPuzzle.objects.count() == 0
        assert Quiz.objects.count() == 0

    def test_persists_quiz_question_daily_puzzle(self, seed_title) -> None:
        with patch(
            "quizzes.management.commands.generate_daily_puzzle.fetch_overview",
            return_value="A long enough synopsis for the pre-check pass.",
        ), patch(
            "quizzes.management.commands.generate_daily_puzzle.generate_ladder",
            return_value=(_stub_ladder(), {"candidates": [{"raw": "stub"}]}),
        ), freeze_time("2026-05-15"):
            call_command("generate_daily_puzzle")

        target = dt.date(2026, 5, 16)
        daily = DailyPuzzle.objects.get(date=target)
        assert daily.quiz.mode == Quiz.PuzzleMode.SYNOPSIS_LADDER
        assert daily.quiz.questions.count() == 1
        question = daily.quiz.questions.first()
        assert question.correct_answer == "Sample Title"
        assert "Rung one" in question.text

    def test_aliases_saved_back_to_title(self, seed_title) -> None:
        with patch(
            "quizzes.management.commands.generate_daily_puzzle.fetch_overview",
            return_value="A long enough synopsis for the pre-check pass.",
        ), patch(
            "quizzes.management.commands.generate_daily_puzzle.generate_ladder",
            return_value=(_stub_ladder(), {"candidates": [{"raw": "stub"}]}),
        ), freeze_time("2026-05-15"):
            call_command("generate_daily_puzzle")
        seed_title.refresh_from_db()
        assert "Sample Title (2020)" in seed_title.aliases

    def test_already_exists_short_circuits(
        self, seed_title, make_daily_puzzle
    ) -> None:
        with freeze_time("2026-05-15"):
            target = dt.date(2026, 5, 16)
            make_daily_puzzle(date=target)
            call_command("generate_daily_puzzle")
        # Still only the one puzzle; nothing new written.
        assert DailyPuzzle.objects.filter(date=target).count() == 1
        # No Gemini call expected — we'd see another Quiz if it had been called.
        assert Quiz.objects.count() == 1

    def test_gemini_failure_raises_command_error(self, seed_title) -> None:
        with patch(
            "quizzes.management.commands.generate_daily_puzzle.fetch_overview",
            return_value="A long enough synopsis for the pre-check pass.",
        ), patch(
            "quizzes.management.commands.generate_daily_puzzle.generate_ladder",
            side_effect=GeminiError("boom"),
        ), freeze_time("2026-05-15"):
            with pytest.raises(CommandError, match="Gemini"):
                call_command("generate_daily_puzzle")
        # No partial write.
        assert DailyPuzzle.objects.count() == 0

    def test_no_eligible_titles_raises(self) -> None:
        with pytest.raises(CommandError, match="No eligible"):
            call_command("generate_daily_puzzle")

    def test_invalid_date_raises(self) -> None:
        with pytest.raises(CommandError, match="Invalid"):
            call_command("generate_daily_puzzle", "--date", "not-a-date")

    def test_force_tmdb_id(self, seed_title) -> None:
        with patch(
            "quizzes.management.commands.generate_daily_puzzle.fetch_overview",
            return_value="A long enough synopsis for the pre-check pass.",
        ), patch(
            "quizzes.management.commands.generate_daily_puzzle.generate_ladder",
            return_value=(_stub_ladder(), {"candidates": [{"raw": "stub"}]}),
        ), freeze_time("2026-05-15"):
            call_command(
                "generate_daily_puzzle",
                "--tmdb-id",
                str(seed_title.tmdb_id),
            )
        assert DailyPuzzle.objects.count() == 1

    def test_force_tmdb_id_unknown_raises(self) -> None:
        with pytest.raises(CommandError, match="not found"):
            call_command("generate_daily_puzzle", "--tmdb-id", "0")

    def test_audit_fields_persisted(self, seed_title) -> None:
        raw_response = {"candidates": [{"content": {"parts": [{"text": "..."}]}}]}
        with patch(
            "quizzes.management.commands.generate_daily_puzzle.fetch_overview",
            return_value="A long enough synopsis for the pre-check pass.",
        ), patch(
            "quizzes.management.commands.generate_daily_puzzle.generate_ladder",
            return_value=(_stub_ladder(), raw_response),
        ), freeze_time("2026-05-15"):
            call_command("generate_daily_puzzle")

        daily = DailyPuzzle.objects.get(date=dt.date(2026, 5, 16))
        assert daily.gemini_raw_response == raw_response
        assert daily.gemini_prompt_version == "v1"
        assert daily.gemini_model_name == "gemini-1.5-flash"
        # SHA-256 of the synopsis text we passed in.
        assert len(daily.tmdb_overview_hash) == 64


@pytest.mark.django_db
class TestFetchOverviewFallback:
    """Cover the TMDb → OMDb → Wikidata chain."""

    def test_tmdb_5xx_then_omdb_hits(self, seed_title=None) -> None:
        from quizzes.integrations.tmdb import TMDbError
        from quizzes.management.commands import generate_daily_puzzle as gdp

        with patch.object(gdp, "fetch_overview", side_effect=TMDbError("503")), patch.object(
            gdp, "omdb_fetch_overview", return_value="OMDb plot."
        ) as omdb_call, patch.object(
            gdp, "wikidata_fetch_overview"
        ) as wikidata_call:
            result = gdp.fetch_overview_with_fallback(
                tmdb_id=1, kind="movie", title="X", year=2020
            )
        assert result == "OMDb plot."
        omdb_call.assert_called_once_with("X", year=2020)
        wikidata_call.assert_not_called()

    def test_tmdb_and_omdb_fail_wikidata_hits(self) -> None:
        from quizzes.integrations.omdb import OMDbError
        from quizzes.integrations.tmdb import TMDbError
        from quizzes.management.commands import generate_daily_puzzle as gdp

        with patch.object(gdp, "fetch_overview", side_effect=TMDbError("503")), patch.object(
            gdp, "omdb_fetch_overview", side_effect=OMDbError("miss")
        ), patch.object(
            gdp, "wikidata_fetch_overview", return_value="Wikidata description."
        ):
            result = gdp.fetch_overview_with_fallback(
                tmdb_id=1, kind="movie", title="X", year=2020
            )
        assert result == "Wikidata description."

    def test_all_sources_fail(self) -> None:
        from quizzes.integrations.omdb import OMDbError
        from quizzes.integrations.tmdb import TMDbError
        from quizzes.integrations.wikidata import WikidataError
        from quizzes.management.commands import generate_daily_puzzle as gdp

        with patch.object(gdp, "fetch_overview", side_effect=TMDbError("503")), patch.object(
            gdp, "omdb_fetch_overview", side_effect=OMDbError("miss")
        ), patch.object(
            gdp, "wikidata_fetch_overview", side_effect=WikidataError("none")
        ):
            with pytest.raises(CommandError, match="All overview"):
                gdp.fetch_overview_with_fallback(
                    tmdb_id=1, kind="movie", title="X", year=2020
                )

    def test_tmdb_empty_falls_through(self) -> None:
        from quizzes.management.commands import generate_daily_puzzle as gdp

        with patch.object(gdp, "fetch_overview", return_value=""), patch.object(
            gdp, "omdb_fetch_overview", return_value="OMDb plot."
        ):
            result = gdp.fetch_overview_with_fallback(
                tmdb_id=1, kind="movie", title="X", year=2020
            )
        assert result == "OMDb plot."


# ──────────────────────────────────────────────────────────────────────────
# backfill_daily_puzzles
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestBackfillDailyPuzzles:
    def _patches(self):
        return [
            patch(
                "quizzes.management.commands.generate_daily_puzzle.fetch_overview_with_fallback",
                return_value="A long enough synopsis for the pre-check pass.",
            ),
            patch(
                "quizzes.management.commands.generate_daily_puzzle.generate_ladder",
                return_value=(_stub_ladder(), {"candidates": []}),
            ),
        ]

    def test_dry_run_does_not_write(self, make_title) -> None:
        make_title(tmdb_id=42, popularity=99)
        p1, p2 = self._patches()
        with p1, p2, freeze_time("2026-05-15"):
            call_command("backfill_daily_puzzles", "--days", "3", "--dry-run")
        assert DailyPuzzle.objects.count() == 0

    def test_skips_existing_dates(self, make_title, make_daily_puzzle) -> None:
        make_title(tmdb_id=42, popularity=99)
        with freeze_time("2026-05-15"):
            make_daily_puzzle(date=dt.date(2026, 5, 16))
            out = StringIO()
            p1, p2 = self._patches()
            with p1, p2:
                call_command(
                    "backfill_daily_puzzles",
                    "--days",
                    "2",
                    "--start",
                    "2026-05-16",
                    stdout=out,
                )
        # 2026-05-16 already exists, 2026-05-17 newly created.
        assert DailyPuzzle.objects.count() == 2
        assert "skip" in out.getvalue()

    def test_per_day_failure_keeps_going(self, make_title) -> None:
        # Multiple titles so the lookback exclusion still leaves choices
        # across consecutive days.
        for i in range(5):
            make_title(tmdb_id=1000 + i, popularity=100 - i)
        from quizzes.management.commands import generate_daily_puzzle as gdp

        calls = {"n": 0}

        def flaky(*args, **kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                raise CommandError("boom")
            return "A long enough synopsis for the pre-check pass."

        with patch.object(gdp, "fetch_overview_with_fallback", side_effect=flaky), patch.object(
            gdp,
            "generate_ladder",
            return_value=(_stub_ladder(), {"candidates": []}),
        ), freeze_time("2026-05-15"):
            out = StringIO()
            call_command(
                "backfill_daily_puzzles",
                "--days",
                "3",
                "--start",
                "2026-05-20",
                stdout=out,
            )
        # Day 1 fails, days 2+3 succeed.
        assert DailyPuzzle.objects.count() == 2
        text = out.getvalue()
        assert "succeeded" in text
        assert "fail" in text

    def test_invalid_start_raises(self) -> None:
        with pytest.raises(CommandError, match="Invalid"):
            call_command("backfill_daily_puzzles", "--start", "not-a-date")

    def test_zero_days_raises(self) -> None:
        with pytest.raises(CommandError, match="positive"):
            call_command("backfill_daily_puzzles", "--days", "0")


# ──────────────────────────────────────────────────────────────────────────
# AdminPuzzleSeedView — manual content-override endpoint
# ──────────────────────────────────────────────────────────────────────────


def _valid_seed_payload(target: str = "2026-06-15") -> dict:
    return {
        "date": target,
        "title": "Override Movie",
        "year": 2024,
        "kind": "movie",
        "rungs": [
            "A drifter wanders into a town with a long memory and short fuses.",
            "He's looking for someone, but the locals are looking for him.",
            "Sheriff and stranger circle each other across a single dusty week.",
            "A long-buried betrayal surfaces in a poker hand gone wrong.",
            "Allegiances flip; the past returns disguised as a quiet evening.",
            "Sundown brings a confrontation that ends with one man riding out.",
        ],
        "aliases": ["Override Movie", "Override Movie (2024)"],
    }


@pytest.mark.django_db
class TestAdminPuzzleSeedView:
    URL = "/api/v1/quizzes/admin/seed/"

    def test_missing_token_returns_401(
        self, client, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("PUZZLE_SEED_TOKEN", "secret")
        response = client.post(
            self.URL,
            data=_valid_seed_payload(),
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_wrong_token_returns_401(
        self, client, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("PUZZLE_SEED_TOKEN", "secret")
        response = client.post(
            self.URL,
            data=_valid_seed_payload(),
            content_type="application/json",
            HTTP_X_SERVICE_TOKEN="WRONG",
        )
        assert response.status_code == 401

    def test_missing_env_token_returns_401(
        self, client, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("PUZZLE_SEED_TOKEN", raising=False)
        response = client.post(
            self.URL,
            data=_valid_seed_payload(),
            content_type="application/json",
            HTTP_X_SERVICE_TOKEN="anything",
        )
        assert response.status_code == 401

    def test_invalid_schema_returns_400(
        self, client, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("PUZZLE_SEED_TOKEN", "secret")
        bad = _valid_seed_payload()
        bad["rungs"] = bad["rungs"][:5]
        response = client.post(
            self.URL,
            data=bad,
            content_type="application/json",
            HTTP_X_SERVICE_TOKEN="secret",
        )
        assert response.status_code == 400

    def test_happy_path_creates_puzzle(
        self, client, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("PUZZLE_SEED_TOKEN", "secret")
        response = client.post(
            self.URL,
            data=_valid_seed_payload(),
            content_type="application/json",
            HTTP_X_SERVICE_TOKEN="secret",
        )
        assert response.status_code == 201
        daily = DailyPuzzle.objects.get(date=dt.date(2026, 6, 15))
        assert daily.quiz.title == "Override Movie"
        assert daily.gemini_prompt_version == "manual"
        assert daily.quiz.questions.first().correct_answer == "Override Movie"

    def test_replaces_existing_puzzle(
        self,
        client,
        monkeypatch: pytest.MonkeyPatch,
        make_daily_puzzle,
    ) -> None:
        monkeypatch.setenv("PUZZLE_SEED_TOKEN", "secret")
        target = dt.date(2026, 6, 15)
        existing = make_daily_puzzle(date=target)
        existing_quiz_id = existing.quiz_id

        response = client.post(
            self.URL,
            data=_valid_seed_payload("2026-06-15"),
            content_type="application/json",
            HTTP_X_SERVICE_TOKEN="secret",
        )
        assert response.status_code == 201
        # Old quiz gone, new one in place.
        assert not Quiz.objects.filter(id=existing_quiz_id).exists()
        new_daily = DailyPuzzle.objects.get(date=target)
        assert new_daily.quiz.title == "Override Movie"

    def test_invalid_date_returns_400(
        self, client, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("PUZZLE_SEED_TOKEN", "secret")
        bad = _valid_seed_payload()
        bad["date"] = "2026-13-40"  # passes regex, fails fromisoformat
        response = client.post(
            self.URL,
            data=bad,
            content_type="application/json",
            HTTP_X_SERVICE_TOKEN="secret",
        )
        assert response.status_code == 400

    def test_seeds_alias_back_to_title_pool(
        self, client, monkeypatch: pytest.MonkeyPatch, make_title
    ) -> None:
        monkeypatch.setenv("PUZZLE_SEED_TOKEN", "secret")
        make_title(canonical_title="Override Movie", tmdb_id=77777, year=None)
        response = client.post(
            self.URL,
            data=_valid_seed_payload(),
            content_type="application/json",
            HTTP_X_SERVICE_TOKEN="secret",
        )
        assert response.status_code == 201
        title = Title.objects.get(canonical_title="Override Movie")
        assert "Override Movie (2024)" in title.aliases
        assert title.year == 2024

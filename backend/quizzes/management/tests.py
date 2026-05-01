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
from quizzes.models import DailyPuzzle, Question, Quiz, Title


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
            return_value=_stub_ladder(),
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
            return_value=_stub_ladder(),
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
            return_value=_stub_ladder(),
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
            return_value=_stub_ladder(),
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

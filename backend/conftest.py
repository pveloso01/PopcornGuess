"""
Shared pytest fixtures for the PopcornGuess test suite.

Lives at repo-backend root so any tests under `backend/` can import them
without a per-app duplicate. We avoid factory_boy on purpose — the
factories here are tiny, explicit, and don't add a dep.
"""

from __future__ import annotations

import datetime as dt
from typing import Any, Callable

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from analytics.models import AnonymousUser, Streak, UserStats
from quizzes.models import (
    Category,
    DailyPuzzle,
    Question,
    Quiz,
    QuizQuestion,
    Title,
)

User = get_user_model()


@pytest.fixture
def make_user() -> Callable[..., Any]:
    """Build a User with sensible defaults; override any field via kwargs."""
    counter = {"n": 0}

    def _factory(**overrides: Any) -> Any:
        counter["n"] += 1
        n = counter["n"]
        defaults: dict[str, Any] = {
            "email": f"user{n}@example.com",
            "username": f"user{n}",
            "password": "test-pass-1234",
        }
        defaults.update(overrides)
        password = defaults.pop("password")
        user = User.objects.create_user(password=password, **defaults)
        return user

    return _factory


@pytest.fixture
def make_anon() -> Callable[..., AnonymousUser]:
    """Build an AnonymousUser plus its Streak + UserStats partners."""

    def _factory(**overrides: Any) -> AnonymousUser:
        defaults: dict[str, Any] = {"timezone_name": "UTC"}
        defaults.update(overrides)
        # AnonymousUser.device_id is a UUIDField with a default, so omitting
        # it lets uuid.uuid4() generate one. Callers can still pass a
        # specific UUID via overrides.
        anon = AnonymousUser.objects.create(**defaults)
        Streak.objects.create(anonymous_user=anon)
        UserStats.objects.create(anonymous_user=anon)
        return anon

    return _factory


@pytest.fixture
def make_title() -> Callable[..., Title]:
    """Build a Title row, idempotent on tmdb_id."""
    counter = {"n": 0}

    def _factory(**overrides: Any) -> Title:
        counter["n"] += 1
        n = counter["n"]
        defaults: dict[str, Any] = {
            "tmdb_id": 1_000_000 + n,
            "kind": Title.Kind.MOVIE,
            "canonical_title": f"Movie {n}",
            "normalized_title": f"movie {n}",
            "year": 2020,
            "popularity": 100.0 - n,
            "is_active": True,
            "aliases": [],
        }
        defaults.update(overrides)
        return Title.objects.create(**defaults)

    return _factory


@pytest.fixture
def make_category() -> Callable[..., Category]:
    counter = {"n": 0}

    def _factory(**overrides: Any) -> Category:
        counter["n"] += 1
        n = counter["n"]
        defaults: dict[str, Any] = {
            "name": f"Category {n}",
            "slug": f"category-{n}",
            "description": "",
            "is_active": True,
        }
        defaults.update(overrides)
        return Category.objects.create(**defaults)

    return _factory


@pytest.fixture
def make_quiz(make_category: Callable[..., Category]) -> Callable[..., Quiz]:
    """Build a Quiz with `n` attached questions (default 1)."""
    counter = {"n": 0}

    def _factory(
        *,
        questions: int = 1,
        publish_date: dt.date | None = None,
        is_published: bool = True,
        **overrides: Any,
    ) -> Quiz:
        counter["n"] += 1
        n = counter["n"]

        category = overrides.pop("category", None)
        if category is None:
            category = make_category()

        defaults: dict[str, Any] = {
            "title": f"Test Quiz {n}",
            "slug": f"test-quiz-{n}",
            "description": "",
            "quiz_type": Quiz.QuizType.DAILY,
            "mode": Quiz.PuzzleMode.SYNOPSIS_LADDER,
            "max_attempts": 6,
            "is_published": is_published,
            "publish_date": publish_date or timezone.now().date(),
            "category": category,
        }
        defaults.update(overrides)
        quiz = Quiz.objects.create(**defaults)

        for i in range(questions):
            question = Question.objects.create(
                question_type=Question.QuestionType.TEXT,
                text=f"Clue rung 1 for quiz {n} question {i + 1}",
                correct_answer=f"Answer {n}-{i + 1}",
                hint_1="rung 2",
                hint_2="rung 3",
                hint_3="rung 4",
                difficulty=Question.Difficulty.MEDIUM,
            )
            QuizQuestion.objects.create(quiz=quiz, question=question, order=i + 1)

        return quiz

    return _factory


@pytest.fixture
def make_daily_puzzle(
    make_quiz: Callable[..., Quiz],
) -> Callable[..., DailyPuzzle]:
    def _factory(
        *,
        date: dt.date | None = None,
        quiz: Quiz | None = None,
        **overrides: Any,
    ) -> DailyPuzzle:
        active_date = date or timezone.now().date()
        if quiz is None:
            quiz = make_quiz(publish_date=active_date)
        defaults: dict[str, Any] = {
            "date": active_date,
            "quiz": quiz,
            "is_active": True,
        }
        defaults.update(overrides)
        return DailyPuzzle.objects.create(**defaults)

    return _factory

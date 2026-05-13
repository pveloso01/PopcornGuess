"""
Tests for quizzes admin classes.

Exercises display callables and admin actions registered on the admin
site. We instantiate each ModelAdmin off the registry and invoke
methods directly with a fake request so we don't need a logged-in
superuser.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from django.contrib import admin as django_admin

from .admin import (
    CategoryAdmin,
    DailyPuzzleAdmin,
    QuestionAdmin,
    QuizAdmin,
)
from .models import Category, DailyPuzzle, Question, Quiz, QuizQuestion


@pytest.fixture
def fake_request():
    """A minimal request object that admin actions accept."""
    return MagicMock()


@pytest.mark.django_db
class TestQuestionAdmin:
    def test_registered(self) -> None:
        """QuestionAdmin is registered on the admin site."""
        assert isinstance(django_admin.site._registry[Question], QuestionAdmin)

    def test_text_preview_truncates_long_text(self, make_category) -> None:
        """text_preview truncates strings longer than 50 chars."""
        cat = make_category()
        long_text = "x" * 80
        q = Question.objects.create(
            text=long_text, correct_answer="a", category=cat
        )
        admin_obj = django_admin.site._registry[Question]
        result = admin_obj.text_preview(q)
        assert result.endswith("...")
        assert len(result) == 53

    def test_text_preview_short_text(self, make_category) -> None:
        """text_preview returns short text unchanged."""
        cat = make_category()
        q = Question.objects.create(
            text="short", correct_answer="a", category=cat
        )
        admin_obj = django_admin.site._registry[Question]
        assert admin_obj.text_preview(q) == "short"

    def test_success_rate_display(self, make_category) -> None:
        """success_rate_display returns formatted percent."""
        cat = make_category()
        q = Question.objects.create(
            text="t",
            correct_answer="a",
            category=cat,
            times_shown=10,
            times_correct=3,
        )
        admin_obj = django_admin.site._registry[Question]
        assert admin_obj.success_rate_display(q) == "30.0%"

    def test_activate_questions_action(self, make_category, fake_request) -> None:
        """activate_questions sets is_active=True on all rows in queryset."""
        cat = make_category()
        Question.objects.create(
            text="t", correct_answer="a", category=cat, is_active=False
        )
        Question.objects.create(
            text="t2", correct_answer="b", category=cat, is_active=False
        )
        admin_obj = django_admin.site._registry[Question]
        qs = Question.objects.all()
        admin_obj.activate_questions(fake_request, qs)
        assert Question.objects.filter(is_active=True).count() == 2

    def test_deactivate_questions_action(
        self, make_category, fake_request
    ) -> None:
        """deactivate_questions sets is_active=False on rows in queryset."""
        cat = make_category()
        Question.objects.create(
            text="t", correct_answer="a", category=cat, is_active=True
        )
        admin_obj = django_admin.site._registry[Question]
        admin_obj.deactivate_questions(fake_request, Question.objects.all())
        assert Question.objects.filter(is_active=False).count() == 1

    def test_reset_statistics_action(self, make_category, fake_request) -> None:
        """reset_statistics zeros times_shown and times_correct."""
        cat = make_category()
        Question.objects.create(
            text="t",
            correct_answer="a",
            category=cat,
            times_shown=5,
            times_correct=2,
        )
        admin_obj = django_admin.site._registry[Question]
        admin_obj.reset_statistics(fake_request, Question.objects.all())
        q = Question.objects.first()
        assert q.times_shown == 0
        assert q.times_correct == 0


@pytest.mark.django_db
class TestQuizAdmin:
    def test_question_count_display(self, make_quiz) -> None:
        """question_count display returns the model property value."""
        quiz = make_quiz(questions=3)
        admin_obj = django_admin.site._registry[Quiz]
        assert admin_obj.question_count(quiz) == 3

    def test_publish_quizzes_action(self, make_quiz, fake_request) -> None:
        """publish_quizzes sets is_published=True on the queryset."""
        quiz = make_quiz(is_published=False)
        admin_obj = django_admin.site._registry[Quiz]
        admin_obj.publish_quizzes(fake_request, Quiz.objects.filter(pk=quiz.pk))
        quiz.refresh_from_db()
        assert quiz.is_published is True

    def test_unpublish_quizzes_action(self, make_quiz, fake_request) -> None:
        """unpublish_quizzes flips is_published off."""
        quiz = make_quiz(is_published=True)
        admin_obj = django_admin.site._registry[Quiz]
        admin_obj.unpublish_quizzes(
            fake_request, Quiz.objects.filter(pk=quiz.pk)
        )
        quiz.refresh_from_db()
        assert quiz.is_published is False

    def test_duplicate_quiz_action_multiple_selection_noop(
        self, make_quiz, fake_request
    ) -> None:
        """duplicate_quiz refuses to duplicate when multiple quizzes selected."""
        make_quiz()
        make_quiz()
        admin_obj = django_admin.site._registry[Quiz]
        before = Quiz.objects.count()
        admin_obj.duplicate_quiz(fake_request, Quiz.objects.all())
        assert Quiz.objects.count() == before


@pytest.mark.django_db
class TestDailyPuzzleAdmin:
    def test_completion_rate_display(self, make_daily_puzzle) -> None:
        """DailyPuzzleAdmin.completion_rate_display formats the rate."""
        puzzle = make_daily_puzzle()
        puzzle.total_attempts = 8
        puzzle.total_completions = 2
        puzzle.save()
        admin_obj = django_admin.site._registry[DailyPuzzle]
        assert admin_obj.completion_rate_display(puzzle) == "25.0%"


@pytest.mark.django_db
class TestCategoryAdmin:
    def test_registered(self) -> None:
        """CategoryAdmin is registered."""
        assert isinstance(django_admin.site._registry[Category], CategoryAdmin)

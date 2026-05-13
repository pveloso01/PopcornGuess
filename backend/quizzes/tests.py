"""
Test suite for the quizzes app.

Covers:
- Title model + autocomplete view (prefix/substring fallback, limit clamping).
- fuzzy_match utility.
- DailyQuizView, BlitzQuizView, PracticeQuestionView.
- SubmitAnswerView (correct, wrong+hint, fuzzy, alternative answers, exhausted).
- GetHintView (tier 1/2/3, missing hint).
- QuizResultsView (with and without progress).
- CategoryViewSet, QuizViewSet smoke.
"""

from __future__ import annotations

import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Category, Question, Quiz, QuizQuestion, Title
from .views import fuzzy_match


# ──────────────────────────────────────────────────────────────────────────
# fuzzy_match unit tests — pure function, runs without DB.
# ──────────────────────────────────────────────────────────────────────────


class FuzzyMatchTest(TestCase):
    def test_exact_match(self) -> None:
        self.assertTrue(fuzzy_match("Inception", "Inception"))

    def test_case_insensitive(self) -> None:
        self.assertTrue(fuzzy_match("INCEPTION", "inception"))

    def test_whitespace_tolerant(self) -> None:
        self.assertTrue(fuzzy_match("  Inception  ", "Inception"))

    def test_minor_typo_within_threshold(self) -> None:
        # 1 char off in 9 = ~88% ratio, above the 85% default.
        self.assertTrue(fuzzy_match("Inceptoin", "Inception"))

    def test_far_off_rejected(self) -> None:
        self.assertFalse(fuzzy_match("Avatar", "Inception"))

    def test_custom_threshold(self) -> None:
        self.assertFalse(fuzzy_match("Inceptoin", "Inception", threshold=0.99))


# ──────────────────────────────────────────────────────────────────────────
# Title model.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTitleModel:
    def test_str_with_year(self, make_title) -> None:
        title = make_title(canonical_title="The Matrix", year=1999)
        assert "Matrix" in str(title) and "1999" in str(title)

    def test_str_without_year(self, make_title) -> None:
        title = make_title(canonical_title="Untitled", year=None)
        assert str(title) == "Untitled"

    def test_default_ordering_is_popularity_desc(self, make_title) -> None:
        a = make_title(canonical_title="Z low", popularity=1.0)
        b = make_title(canonical_title="A high", popularity=99.0)
        ordered = list(Title.objects.all())
        assert ordered.index(b) < ordered.index(a)


# ──────────────────────────────────────────────────────────────────────────
# TitleAutocompleteView — most failure-prone surface (URL collisions, etc.).
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTitleAutocompleteView:
    URL = "/api/v1/quizzes/titles/"

    def test_query_too_short_returns_empty(self, make_title) -> None:
        make_title(canonical_title="The Matrix", normalized_title="the matrix")
        client = APIClient()
        response = client.get(self.URL, {"q": "t"})
        assert response.status_code == 200
        assert response.data == {"results": []}

    def test_prefix_match_orders_by_popularity(self, make_title) -> None:
        make_title(
            canonical_title="The Matrix",
            normalized_title="the matrix",
            popularity=80,
        )
        make_title(
            canonical_title="The Godfather",
            normalized_title="the godfather",
            popularity=99,
        )
        make_title(
            canonical_title="The Dark Knight",
            normalized_title="the dark knight",
            popularity=90,
        )

        client = APIClient()
        response = client.get(self.URL, {"q": "the"})
        titles = [r["title"] for r in response.data["results"]]
        assert titles == ["The Godfather", "The Dark Knight", "The Matrix"]

    def test_substring_fallback_fills_when_prefix_runs_out(
        self, make_title
    ) -> None:
        # Only one prefix-match for "matrix"; the substring fallback
        # should pick up "The Matrix" via normalized_title__contains.
        make_title(
            canonical_title="Matrix Reloaded",
            normalized_title="matrix reloaded",
            popularity=80,
        )
        make_title(
            canonical_title="The Matrix",
            normalized_title="the matrix",
            popularity=99,
        )
        client = APIClient()
        response = client.get(self.URL, {"q": "matrix", "limit": "5"})
        titles = [r["title"] for r in response.data["results"]]
        assert "Matrix Reloaded" in titles
        assert "The Matrix" in titles

    def test_limit_clamped_to_20(self, make_title) -> None:
        for i in range(25):
            make_title(
                canonical_title=f"The Movie {i:02d}",
                normalized_title=f"the movie {i:02d}",
                popularity=float(100 - i),
            )
        client = APIClient()
        response = client.get(self.URL, {"q": "the", "limit": "999"})
        assert len(response.data["results"]) == 20

    def test_default_limit_is_8(self, make_title) -> None:
        for i in range(15):
            make_title(
                canonical_title=f"The Movie {i:02d}",
                normalized_title=f"the movie {i:02d}",
                popularity=float(100 - i),
            )
        client = APIClient()
        response = client.get(self.URL, {"q": "the"})
        assert len(response.data["results"]) == 8

    def test_inactive_titles_excluded(self, make_title) -> None:
        make_title(
            canonical_title="Inactive",
            normalized_title="inactive",
            is_active=False,
        )
        client = APIClient()
        response = client.get(self.URL, {"q": "inactive"})
        assert response.data["results"] == []

    def test_invalid_limit_falls_back_to_default(self, make_title) -> None:
        for i in range(12):
            make_title(
                canonical_title=f"The Movie {i:02d}",
                normalized_title=f"the movie {i:02d}",
            )
        client = APIClient()
        response = client.get(self.URL, {"q": "the", "limit": "garbage"})
        assert response.status_code == 200
        assert len(response.data["results"]) == 8


# ──────────────────────────────────────────────────────────────────────────
# Daily / Blitz / Practice views.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestDailyQuizView:
    URL = "/api/v1/quizzes/daily/"

    def test_returns_today_puzzle(self, make_daily_puzzle) -> None:
        puzzle = make_daily_puzzle()
        client = APIClient()
        response = client.get(self.URL)
        assert response.status_code == 200
        assert response.data["id"] == puzzle.id

    def test_404_when_no_puzzle(self) -> None:
        client = APIClient()
        response = client.get(self.URL)
        assert response.status_code == 404


@pytest.mark.django_db
class TestBlitzQuizView:
    URL = "/api/v1/quizzes/blitz/start/"

    def test_returns_a_blitz_quiz(self, make_quiz) -> None:
        quiz = make_quiz(quiz_type=Quiz.QuizType.BLITZ)
        client = APIClient()
        response = client.get(self.URL)
        assert response.status_code == 200
        assert response.data["id"] == quiz.id

    def test_404_when_no_blitz_published(self, make_quiz) -> None:
        # Quiz exists but as DAILY, not BLITZ.
        make_quiz(quiz_type=Quiz.QuizType.DAILY)
        client = APIClient()
        response = client.get(self.URL)
        assert response.status_code == 404

    def test_increments_times_played(self, make_quiz) -> None:
        quiz = make_quiz(quiz_type=Quiz.QuizType.BLITZ)
        before = quiz.times_played
        APIClient().get(self.URL)
        quiz.refresh_from_db()
        assert quiz.times_played == before + 1


@pytest.mark.django_db
class TestPracticeQuestionView:
    URL = "/api/v1/quizzes/practice/random/"

    def test_returns_questions(self, make_quiz) -> None:
        make_quiz(questions=5)
        client = APIClient()
        response = client.get(self.URL, {"count": 3})
        assert response.status_code == 200
        assert 1 <= len(response.data) <= 3

    def test_404_when_pool_empty(self) -> None:
        client = APIClient()
        response = client.get(self.URL)
        assert response.status_code == 404

    def test_filter_by_difficulty(self, make_quiz) -> None:
        # Quiz factory creates MEDIUM difficulty questions by default.
        make_quiz(questions=3)
        client = APIClient()
        response = client.get(self.URL, {"difficulty": "hard"})
        assert response.status_code == 404


# ──────────────────────────────────────────────────────────────────────────
# Submit answer.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSubmitAnswerView:
    URL = "/api/v1/quizzes/submit/"

    @pytest.fixture
    def quiz_with_question(self, make_quiz):
        quiz = make_quiz(questions=1)
        question = quiz.questions.first()
        question.correct_answer = "Inception"
        question.alternative_answers = ["Inception (2010)"]
        question.hint_1 = "Director: Christopher Nolan"
        question.hint_2 = "Year: 2010"
        question.hint_3 = "Stars Leonardo DiCaprio"
        question.save()
        return quiz, question

    def test_correct_answer(self, quiz_with_question) -> None:
        quiz, question = quiz_with_question
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": question.id,
                "answer": "Inception",
                "attempt_number": 1,
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.data["is_correct"] is True
        assert response.data["correct_answer"] == "Inception"

    def test_fuzzy_typo_accepted(self, quiz_with_question) -> None:
        quiz, question = quiz_with_question
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": question.id,
                "answer": "inceptoin",
                "attempt_number": 1,
            },
            format="json",
        )
        assert response.data["is_correct"] is True

    def test_alternative_answer_accepted(self, quiz_with_question) -> None:
        quiz, question = quiz_with_question
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": question.id,
                "answer": "Inception (2010)",
                "attempt_number": 1,
            },
            format="json",
        )
        assert response.data["is_correct"] is True

    def test_wrong_answer_serves_hint_at_attempt_2(
        self, quiz_with_question
    ) -> None:
        quiz, question = quiz_with_question
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": question.id,
                "answer": "Avatar",
                "attempt_number": 2,
            },
            format="json",
        )
        assert response.data["is_correct"] is False
        assert response.data["hint"] == "Director: Christopher Nolan"

    def test_attempts_exhausted_reveals_answer(
        self, quiz_with_question
    ) -> None:
        quiz, question = quiz_with_question
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": question.id,
                "answer": "Avatar",
                "attempt_number": 6,
            },
            format="json",
        )
        assert response.data["attempts_remaining"] == 0
        assert response.data["correct_answer"] == "Inception"

    def test_question_not_found_returns_400(self, make_quiz) -> None:
        # Serializer validates question_id existence, so unknown ID is a
        # 400 (validation error), not a 404.
        quiz = make_quiz()
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": 99_999_999,
                "answer": "x",
                "attempt_number": 1,
            },
            format="json",
        )
        assert response.status_code == 400

    def test_validation_error_on_missing_field(self) -> None:
        response = APIClient().post(self.URL, {}, format="json")
        assert response.status_code == 400

    def test_question_stats_increment(self, quiz_with_question) -> None:
        quiz, question = quiz_with_question
        before_shown = question.times_shown
        before_correct = question.times_correct
        APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": question.id,
                "answer": "Inception",
                "attempt_number": 1,
            },
            format="json",
        )
        question.refresh_from_db()
        assert question.times_shown == before_shown + 1
        assert question.times_correct == before_correct + 1


# ──────────────────────────────────────────────────────────────────────────
# Hints.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGetHintView:
    URL = "/api/v1/quizzes/hint/"

    @pytest.fixture
    def question_with_hints(self, make_quiz):
        quiz = make_quiz(questions=1)
        q = quiz.questions.first()
        q.hint_1 = "h1"
        q.hint_2 = "h2"
        q.hint_3 = "h3"
        q.save()
        return q

    def test_hint_tier_1(self, question_with_hints) -> None:
        response = APIClient().post(
            self.URL,
            {"question_id": question_with_hints.id, "hint_number": 1},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["hint"] == "h1"
        assert response.data["hints_remaining"] == 2

    def test_hint_tier_3(self, question_with_hints) -> None:
        response = APIClient().post(
            self.URL,
            {"question_id": question_with_hints.id, "hint_number": 3},
            format="json",
        )
        assert response.data["hint"] == "h3"
        assert response.data["hints_remaining"] == 0

    def test_missing_hint_returns_404(self, make_quiz) -> None:
        quiz = make_quiz(questions=1)
        q = quiz.questions.first()
        q.hint_1 = ""
        q.save()
        response = APIClient().post(
            self.URL,
            {"question_id": q.id, "hint_number": 1},
            format="json",
        )
        assert response.status_code == 404

    def test_question_not_found_returns_400(self) -> None:
        # Same pattern as submit: serializer validates first.
        response = APIClient().post(
            self.URL,
            {"question_id": 99_999_999, "hint_number": 1},
            format="json",
        )
        assert response.status_code == 400


# ──────────────────────────────────────────────────────────────────────────
# Results.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestQuizResultsView:
    def test_returns_results_without_progress(self, make_quiz) -> None:
        quiz = make_quiz(questions=2)
        client = APIClient()
        response = client.get(f"/api/v1/quizzes/results/{quiz.id}/")
        assert response.status_code == 200
        assert response.data["quiz_id"] == quiz.id
        assert response.data["total_questions"] == 2
        assert response.data["score"] == 0  # no progress

    def test_quiz_not_found(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/quizzes/results/99999999/")
        assert response.status_code == 404

    def test_includes_shareable_text(self, make_quiz) -> None:
        quiz = make_quiz(questions=1)
        response = APIClient().get(f"/api/v1/quizzes/results/{quiz.id}/")
        assert "shareable_text" in response.data


# ──────────────────────────────────────────────────────────────────────────
# CategoryViewSet & QuizViewSet smoke (router-mounted).
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRouterEndpoints:
    def test_categories_list(self, make_category) -> None:
        make_category()
        response = APIClient().get("/api/v1/categories/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_quizzes_list_and_detail(self, make_quiz) -> None:
        quiz = make_quiz()
        client = APIClient()
        list_response = client.get("/api/v1/quizzes/")
        assert list_response.status_code == 200
        # ViewSet uses lookup_field="slug", not pk.
        detail_response = client.get(f"/api/v1/quizzes/{quiz.slug}/")
        assert detail_response.status_code == 200
        assert detail_response.data["id"] == quiz.id

    def test_quizzes_titles_does_not_collide_with_quiz_pk(
        self, make_title
    ) -> None:
        # Regression: /quizzes/titles/ must hit autocomplete, not be
        # interpreted as Quiz pk='titles'.
        make_title(canonical_title="Titanic", normalized_title="titanic")
        response = APIClient().get("/api/v1/quizzes/titles/", {"q": "tit"})
        assert response.status_code == 200
        assert "results" in response.data


# ──────────────────────────────────────────────────────────────────────────
# Existing legacy tests preserved (they were the placeholder set).
# ──────────────────────────────────────────────────────────────────────────


class QuizModelTestCase(TestCase):
    """Test Quiz model — kept from the original placeholder suite."""

    def setUp(self) -> None:
        self.category = Category.objects.create(
            name="Test Category", slug="test-category"
        )
        self.quiz = Quiz.objects.create(
            title="Test Quiz",
            slug="test-quiz",
            quiz_type="daily",
            category=self.category,
        )

    def test_quiz_creation(self) -> None:
        self.assertEqual(self.quiz.title, "Test Quiz")
        self.assertEqual(self.quiz.quiz_type, "daily")

    def test_quiz_question_count(self) -> None:
        self.assertEqual(self.quiz.question_count, 0)
        question = Question.objects.create(
            text="Test Question?",
            correct_answer="Test Answer",
            category=self.category,
        )
        QuizQuestion.objects.create(quiz=self.quiz, question=question, order=1)
        self.assertEqual(self.quiz.question_count, 1)


class QuestionModelTestCase(TestCase):
    """Test Question model — kept from the original placeholder suite."""

    def setUp(self) -> None:
        self.category = Category.objects.create(name="Movies", slug="movies")

    def test_question_creation(self) -> None:
        question = Question.objects.create(
            text="What movie?",
            correct_answer="The Matrix",
            category=self.category,
            difficulty="easy",
        )
        self.assertEqual(question.text, "What movie?")
        self.assertEqual(question.difficulty, "easy")

    def test_success_rate(self) -> None:
        question = Question.objects.create(
            text="Test?",
            correct_answer="Answer",
            category=self.category,
            times_shown=10,
            times_correct=7,
        )
        self.assertEqual(question.success_rate, 70.0)


# ──────────────────────────────────────────────────────────────────────────
# Additional view edges to push coverage above 90%.
# ──────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPracticeQuestionViewExtra:
    """Cover the category filter branch on practice mode."""

    URL = "/api/v1/quizzes/practice/random/"

    def test_filter_by_category_slug(self, make_quiz, make_category) -> None:
        """Practice questions can be filtered by category slug."""
        cat = make_category()
        quiz = make_quiz(questions=2, category=cat)
        # The conftest factory doesn't set category on Questions; stamp it
        # so the slug filter actually matches.
        for q in quiz.questions.all():
            q.category = cat
            q.save()
        client = APIClient()
        response = client.get(self.URL, {"category": cat.slug})
        assert response.status_code == 200

    def test_filter_by_unknown_category_returns_404(self, make_quiz) -> None:
        """An unknown category slug yields no questions and a 404."""
        make_quiz(questions=2)
        response = APIClient().get(self.URL, {"category": "no-such-slug"})
        assert response.status_code == 404


@pytest.mark.django_db
class TestSubmitAnswerHintTiers:
    """Cover the tier-2 and tier-3 hint branches (only reachable when
    earlier hints are empty)."""

    URL = "/api/v1/quizzes/submit/"

    @pytest.fixture
    def question_without_tier1_hint(self, make_quiz):
        quiz = make_quiz(questions=1)
        q = quiz.questions.first()
        q.correct_answer = "Inception"
        q.hint_1 = ""  # falsy → falls through to tier-2 check
        q.hint_2 = "Year: 2010"
        q.hint_3 = "Lead: DiCaprio"
        q.save()
        return quiz, q

    def test_attempt_4_falls_through_to_hint_2(
        self, question_without_tier1_hint
    ) -> None:
        """When hint_1 is empty, attempt_number 4 serves hint_2."""
        quiz, q = question_without_tier1_hint
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": q.id,
                "answer": "Avatar",
                "attempt_number": 4,
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.data["hint"] == "Year: 2010"

    def test_attempt_5_falls_through_to_hint_3(self, make_quiz) -> None:
        """When hint_1 and hint_2 are empty, attempt_number 5 serves hint_3."""
        quiz = make_quiz(questions=1)
        q = quiz.questions.first()
        q.correct_answer = "Inception"
        q.hint_1 = ""
        q.hint_2 = ""
        q.hint_3 = "Lead: DiCaprio"
        q.save()
        response = APIClient().post(
            self.URL,
            {
                "quiz_id": quiz.id,
                "question_id": q.id,
                "answer": "Avatar",
                "attempt_number": 5,
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.data["hint"] == "Lead: DiCaprio"


@pytest.mark.django_db
class TestGetHintViewHintsRemaining:
    """hints_remaining calculation when only one hint exists."""

    URL = "/api/v1/quizzes/hint/"

    def test_hints_remaining_zero_when_only_one_hint(self, make_quiz) -> None:
        """If the question has only hint_1, requesting hint_1 leaves zero remaining."""
        quiz = make_quiz(questions=1)
        q = quiz.questions.first()
        q.hint_1 = "only"
        q.hint_2 = ""
        q.hint_3 = ""
        q.save()
        response = APIClient().post(
            self.URL,
            {"question_id": q.id, "hint_number": 1},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["hint"] == "only"
        assert response.data["hints_remaining"] == 0


@pytest.mark.django_db
class TestQuizResultsWithProgress:
    """Cover the progress-id branch + shareable-text grid generation."""

    def test_results_with_valid_progress_id(self, make_user, make_quiz) -> None:
        """A valid progress_id surfaces score, percentage and is_perfect."""
        from analytics.models import UserProgress

        user = make_user()
        quiz = make_quiz(questions=2)
        progress = UserProgress.objects.create(
            user=user,
            quiz=quiz,
            total_questions=2,
            score=2,
            time_taken_seconds=15,
            answers=[
                {"isCorrect": True, "value": "A"},
                {"isCorrect": True, "value": "B"},
            ],
        )
        response = APIClient().get(
            f"/api/v1/quizzes/results/{quiz.id}/?progress_id={progress.id}"
        )
        assert response.status_code == 200
        assert response.data["score"] == 2
        assert response.data["is_perfect"] is True
        assert response.data["time_taken_seconds"] == 15
        # Grid embeds at least one correct-marker glyph.
        assert "🟩" in response.data["shareable_text"]

    def test_results_with_unknown_progress_id_falls_back_to_recent(
        self, make_anon, make_quiz
    ) -> None:
        """
        Unknown progress_id triggers the device-id fallback: pick the
        most recent UserProgress for this quiz+device. Without this,
        a player who lost their progress_id (refresh, deep link) used
        to see 0/N even after a perfect run.
        """
        from analytics.models import UserProgress

        anon = make_anon()
        quiz = make_quiz(questions=2)
        UserProgress.objects.create(
            anonymous_user=anon,
            quiz=quiz,
            total_questions=2,
            score=2,
        )
        response = APIClient().get(
            f"/api/v1/quizzes/results/{quiz.id}/?progress_id=99999999",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert response.status_code == 200
        assert response.data["score"] == 2

    def test_results_without_progress_id_uses_device_fallback(
        self, make_anon, make_quiz
    ) -> None:
        """No progress_id at all — fallback finds the latest run by device."""
        from analytics.models import UserProgress

        anon = make_anon()
        quiz = make_quiz(questions=3)
        UserProgress.objects.create(
            anonymous_user=anon,
            quiz=quiz,
            total_questions=3,
            score=3,
        )
        response = APIClient().get(
            f"/api/v1/quizzes/results/{quiz.id}/",
            HTTP_X_DEVICE_ID=str(anon.device_id),
        )
        assert response.status_code == 200
        assert response.data["score"] == 3

    def test_results_without_device_id_returns_zero(self, make_quiz) -> None:
        """No progress_id AND no device-id means we can't identify anyone."""
        quiz = make_quiz(questions=1)
        response = APIClient().get(f"/api/v1/quizzes/results/{quiz.id}/")
        assert response.status_code == 200
        assert response.data["score"] == 0

    def test_results_grid_with_incorrect_answers(
        self, make_user, make_quiz
    ) -> None:
        """The shareable grid uses the wrong-answer glyph for incorrect rows."""
        from analytics.models import UserProgress

        user = make_user()
        quiz = make_quiz(questions=2)
        progress = UserProgress.objects.create(
            user=user,
            quiz=quiz,
            total_questions=2,
            score=1,
            answers=[
                {"isCorrect": True, "value": "A"},
                {"isCorrect": False, "value": "B"},
            ],
        )
        response = APIClient().get(
            f"/api/v1/quizzes/results/{quiz.id}/?progress_id={progress.id}"
        )
        assert "🟥" in response.data["shareable_text"]

"""
Feature 18: Comprehensive Testing
Tests for Quiz models and views
"""

from django.test import TestCase

from .models import Category, Question, Quiz


class QuizModelTestCase(TestCase):
    """Test Quiz model"""

    def setUp(self):
        self.category = Category.objects.create(
            name="Test Category", slug="test-category"
        )
        self.quiz = Quiz.objects.create(
            title="Test Quiz",
            slug="test-quiz",
            quiz_type="daily",
            category=self.category,
        )

    def test_quiz_creation(self):
        """Test quiz is created correctly"""
        self.assertEqual(self.quiz.title, "Test Quiz")
        self.assertEqual(self.quiz.quiz_type, "daily")

    def test_quiz_question_count(self):
        """Test question count property"""
        self.assertEqual(self.quiz.question_count, 0)
        Question.objects.create(
            text="Test Question?",
            correct_answer="Test Answer",
            category=self.category,
        )
        # Would need to add to quiz via QuizQuestion
        self.assertEqual(self.quiz.question_count, 0)


class QuestionModelTestCase(TestCase):
    """Test Question model"""

    def setUp(self):
        self.category = Category.objects.create(name="Movies", slug="movies")

    def test_question_creation(self):
        """Test question is created correctly"""
        question = Question.objects.create(
            text="What movie?",
            correct_answer="The Matrix",
            category=self.category,
            difficulty="easy",
        )
        self.assertEqual(question.text, "What movie?")
        self.assertEqual(question.difficulty, "easy")

    def test_success_rate(self):
        """Test success rate calculation"""
        question = Question.objects.create(
            text="Test?",
            correct_answer="Answer",
            category=self.category,
            times_shown=10,
            times_correct=7,
        )
        self.assertEqual(question.success_rate, 70.0)

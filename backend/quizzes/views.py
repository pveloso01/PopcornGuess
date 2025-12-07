"""
API views for quiz gameplay.
"""

from difflib import SequenceMatcher

from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, DailyPuzzle, Question, Quiz
from .serializers import (
    AnswerResultSerializer,
    AnswerSubmissionSerializer,
    CategorySerializer,
    DailyPuzzleSerializer,
    HintRequestSerializer,
    HintResponseSerializer,
    QuizDetailSerializer,
    QuizListSerializer,
    QuizResultsSerializer,
)


def fuzzy_match(answer: str, correct: str, threshold: float = 0.85) -> bool:
    """
    Check if the answer is close enough to the correct answer.

    Uses SequenceMatcher for fuzzy string matching to handle:
    - Minor typos
    - Different capitalization
    - Extra/missing spaces
    """
    # Normalize strings
    answer_normalized = answer.lower().strip()
    correct_normalized = correct.lower().strip()

    # Exact match
    if answer_normalized == correct_normalized:
        return True

    # Fuzzy match using SequenceMatcher
    ratio = SequenceMatcher(None, answer_normalized, correct_normalized).ratio()
    return ratio >= threshold


@extend_schema_view(
    list=extend_schema(
        summary="List all categories",
        description="Get a list of all quiz categories.",
        tags=["quizzes"],
    ),
    retrieve=extend_schema(
        summary="Get category details",
        description="Get details for a specific category.",
        tags=["quizzes"],
    ),
)
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for quiz categories."""

    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


@extend_schema_view(
    list=extend_schema(
        summary="List all quizzes",
        description="Get a paginated list of published quizzes.",
        tags=["quizzes"],
    ),
    retrieve=extend_schema(
        summary="Get quiz details",
        description="Get full details for a quiz including questions.",
        tags=["quizzes"],
    ),
)
class QuizViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for quizzes."""

    queryset = Quiz.objects.filter(is_published=True)
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_serializer_class(self):  # type: ignore[no-untyped-def]
        """Return appropriate serializer."""
        if self.action == "list":
            return QuizListSerializer
        return QuizDetailSerializer


class DailyQuizView(APIView):
    """Get today's daily quiz."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get today's daily quiz",
        description=(
            "Retrieve today's daily puzzle. Returns the quiz with questions "
            "(answers hidden). One quiz per day creates anticipation."
        ),
        tags=["quizzes"],
        responses={
            200: DailyPuzzleSerializer,
            404: OpenApiResponse(description="No daily puzzle for today"),
        },
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Get today's daily puzzle."""
        daily_puzzle = DailyPuzzle.get_today()

        if not daily_puzzle:
            return Response(
                {"detail": "No daily puzzle available for today."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = DailyPuzzleSerializer(daily_puzzle)
        return Response(serializer.data)


class SubmitAnswerView(APIView):
    """Submit an answer to a quiz question."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Submit an answer",
        description=(
            "Submit an answer for a quiz question. Uses fuzzy matching "
            "to handle minor typos. Returns whether the answer was correct "
            "and provides hints if incorrect."
        ),
        tags=["quizzes"],
        request=AnswerSubmissionSerializer,
        responses={
            200: AnswerResultSerializer,
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(description="Question not found"),
        },
    )
    def post(self, request):  # type: ignore[no-untyped-def]
        """Validate an answer submission."""
        serializer = AnswerSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question_id = serializer.validated_data["question_id"]
        answer = serializer.validated_data["answer"]
        attempt_number = serializer.validated_data["attempt_number"]

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response(
                {"detail": "Question not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check against correct answer and alternatives
        is_correct = fuzzy_match(answer, question.correct_answer)

        if not is_correct:
            for alt_answer in question.alternative_answers:
                if fuzzy_match(answer, alt_answer):
                    is_correct = True
                    break

        # Update question statistics
        question.times_shown += 1
        if is_correct:
            question.times_correct += 1
        question.save()

        # Determine hint to show based on attempt number
        hint = None
        if not is_correct:
            if attempt_number >= 2 and question.hint_1:
                hint = question.hint_1
            elif attempt_number >= 4 and question.hint_2:
                hint = question.hint_2
            elif attempt_number >= 5 and question.hint_3:
                hint = question.hint_3

        # Get max attempts from quiz (default 6)
        max_attempts = 6  # Could be dynamic based on quiz
        attempts_remaining = max(0, max_attempts - attempt_number)

        # Only reveal answer if no attempts remaining
        correct_answer = None
        explanation = None
        if is_correct or attempts_remaining == 0:
            correct_answer = question.correct_answer
            explanation = question.explanation

        result = {
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "hint": hint,
            "attempts_remaining": attempts_remaining,
            "explanation": explanation,
        }

        result_serializer = AnswerResultSerializer(result)
        return Response(result_serializer.data)


class GetHintView(APIView):
    """Request a hint for a question."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get a hint",
        description=(
            "Request a hint for a question. Progressive hints reveal "
            "more information (year, genre, director, etc.)."
        ),
        tags=["quizzes"],
        request=HintRequestSerializer,
        responses={
            200: HintResponseSerializer,
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(description="Question not found or no hint available"),
        },
    )
    def post(self, request):  # type: ignore[no-untyped-def]
        """Get a hint for a question."""
        serializer = HintRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question_id = serializer.validated_data["question_id"]
        hint_number = serializer.validated_data["hint_number"]

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response(
                {"detail": "Question not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get the requested hint
        hint_map = {
            1: question.hint_1,
            2: question.hint_2,
            3: question.hint_3,
        }

        hint = hint_map.get(hint_number)
        if not hint:
            return Response(
                {"detail": f"Hint {hint_number} not available for this question."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Count remaining hints
        hints_remaining = sum(1 for h in [question.hint_1, question.hint_2, question.hint_3] if h) - hint_number

        result = {
            "hint": hint,
            "hint_number": hint_number,
            "hints_remaining": max(0, hints_remaining),
        }

        result_serializer = HintResponseSerializer(result)
        return Response(result_serializer.data)


class QuizResultsView(APIView):
    """Get results for a completed quiz."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get quiz results",
        description=(
            "Get the results for a completed quiz, including all "
            "questions with their correct answers and explanations."
        ),
        tags=["quizzes"],
        responses={
            200: QuizResultsSerializer,
            404: OpenApiResponse(description="Quiz not found"),
        },
    )
    def get(self, request, quiz_id):  # type: ignore[no-untyped-def]
        """Get quiz results with all answers revealed."""
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response(
                {"detail": "Quiz not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # In a full implementation, this would fetch the user's
        # actual progress from UserProgress model
        questions = quiz.questions.all()

        result = {
            "quiz_id": quiz.id,
            "score": 0,  # Would come from UserProgress
            "total_questions": questions.count(),
            "percentage": 0.0,  # Would be calculated
            "is_perfect": False,
            "time_taken_seconds": None,
            "questions_with_answers": questions,
            "streak_updated": False,
            "new_streak": 0,
        }

        serializer = QuizResultsSerializer(result)
        return Response(serializer.data)

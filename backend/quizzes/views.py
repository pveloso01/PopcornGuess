"""
API views for quiz gameplay.
"""

from difflib import SequenceMatcher

from django.utils import timezone

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, DailyPuzzle, Question, Quiz, Title
from .serializers import (
    AnswerResultSerializer,
    AnswerSubmissionSerializer,
    CategorySerializer,
    DailyPuzzleSerializer,
    HintRequestSerializer,
    HintResponseSerializer,
    QuestionSerializer,
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


class BlitzQuizView(APIView):
    """Get a blitz mode quiz."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Start a blitz quiz",
        description=(
            "Get a random blitz quiz for fast-paced gameplay. "
            "Blitz mode features a time limit and rapid-fire questions."
        ),
        tags=["quizzes"],
        responses={
            200: QuizDetailSerializer,
            404: OpenApiResponse(description="No blitz quiz available"),
        },
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Get a random blitz quiz."""
        import random

        # Get all published blitz quizzes
        blitz_quizzes = Quiz.objects.filter(
            quiz_type="blitz", is_published=True
        ).prefetch_related("questions")

        if not blitz_quizzes.exists():
            return Response(
                {"detail": "No blitz quizzes available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Select a random quiz
        quiz = random.choice(list(blitz_quizzes))  # nosec B311

        # Increment play counter
        quiz.times_played += 1
        quiz.save()

        serializer = QuizDetailSerializer(quiz)
        return Response(serializer.data)


class PracticeQuestionView(APIView):
    """Get random questions for practice mode."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get random practice questions",
        description=(
            "Get a set of random questions for practice mode. "
            "Practice mode is endless with no time limits or streak tracking."
        ),
        tags=["quizzes"],
        parameters=[
            {
                "name": "count",
                "in": "query",
                "description": "Number of questions to fetch (default: 10)",
                "required": False,
                "schema": {"type": "integer", "default": 10},
            },
            {
                "name": "category",
                "in": "query",
                "description": "Filter by category slug",
                "required": False,
                "schema": {"type": "string"},
            },
            {
                "name": "difficulty",
                "in": "query",
                "description": "Filter by difficulty (easy/medium/hard)",
                "required": False,
                "schema": {"type": "string"},
            },
        ],
        responses={
            200: QuestionSerializer(many=True),
            404: OpenApiResponse(description="No questions available"),
        },
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Get random practice questions."""
        import random

        count = int(request.query_params.get("count", 10))
        category_slug = request.query_params.get("category")
        difficulty = request.query_params.get("difficulty")

        # Build query
        questions = Question.objects.filter(is_active=True)

        if category_slug:
            questions = questions.filter(category__slug=category_slug)
        if difficulty:
            questions = questions.filter(difficulty=difficulty)

        questions = list(questions.prefetch_related("category"))

        if not questions:
            return Response(
                {"detail": "No practice questions available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Select random questions
        selected = random.sample(questions, min(count, len(questions)))  # nosec B311

        serializer = QuestionSerializer(selected, many=True)
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
        hints_remaining = (
            sum(1 for h in [question.hint_1, question.hint_2, question.hint_3] if h)
            - hint_number
        )

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
            "questions with their correct answers, explanations, and community stats."
        ),
        tags=["quizzes"],
        responses={
            200: QuizResultsSerializer,
            404: OpenApiResponse(description="Quiz not found"),
        },
    )
    def get(self, request, quiz_id):  # type: ignore[no-untyped-def]
        """Get quiz results with all answers revealed and community stats."""
        from analytics.models import DailyQuizStats, UserProgress

        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response(
                {"detail": "Quiz not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get user progress
        progress_id = request.query_params.get("progress_id")

        user_progress = None
        if progress_id:
            try:
                user_progress = UserProgress.objects.get(id=progress_id)
            except UserProgress.DoesNotExist:
                pass

        # Get community stats
        today = timezone.now().date()
        daily_stats, _ = DailyQuizStats.objects.get_or_create(date=today, quiz=quiz)

        # Get questions with answers (questions are already related to one quiz here)
        questions = quiz.questions.all()
        questions_with_answers = []
        for question in questions:
            questions_with_answers.append(
                {
                    "id": question.id,
                    "text": question.text,
                    "correct_answer": question.correct_answer,
                    "explanation": question.explanation,
                    "image_url": question.image_url,
                    "success_rate": question.success_rate,
                }
            )

        result = {
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "score": user_progress.score if user_progress else 0,
            "total_questions": questions.count(),
            "percentage": (user_progress.percentage_score if user_progress else 0.0),
            "is_perfect": (user_progress.is_perfect_score if user_progress else False),
            "time_taken_seconds": (
                user_progress.time_taken_seconds if user_progress else None
            ),
            "questions_with_answers": questions_with_answers,
            "community_stats": {
                "total_attempts": daily_stats.total_attempts,
                "total_completions": daily_stats.total_completions,
                "completion_rate": daily_stats.completion_rate,
                "average_score": daily_stats.average_score,
            },
            "shareable_text": self._generate_shareable_text(quiz, user_progress),
        }

        serializer = QuizResultsSerializer(result)
        return Response(serializer.data)

    def _generate_shareable_text(
        self, quiz, user_progress  # type: ignore[no-untyped-def]
    ):  # type: ignore[no-untyped-def]
        """Generate Wordle-style shareable text."""
        if not user_progress:
            return ""

        score = user_progress.score
        total = user_progress.total_questions

        # Generate grid (🟩 for correct, 🟥 for incorrect)
        grid_lines = []
        answers = user_progress.answers or []

        for i in range(0, len(answers), 5):  # 5 per row
            row = answers[i : i + 5]
            row_text = "".join(["🟩" if a.get("isCorrect") else "🟥" for a in row])
            grid_lines.append(row_text)

        grid = "\n".join(grid_lines)

        return f"""PopcornGuess - {quiz.title}
{score}/{total} ⭐

{grid}

Play at: https://popcornguess.com"""


def _normalize_title_query(value: str) -> str:
    """Lowercase + collapse whitespace. Used for prefix-match autocomplete."""
    return " ".join(value.lower().strip().split())


class TitleAutocompleteView(APIView):
    """
    GET /api/v1/quizzes/titles/?q=<query>&limit=<n>

    Returns up to `limit` (default 8, max 20) movie/TV titles matching the
    query as a prefix or alias. Public, anonymous-safe, throttled.
    """

    permission_classes = [AllowAny]
    throttle_scope = "autocomplete"

    @extend_schema(
        summary="Title autocomplete",
        description=(
            "Search the curated TMDb-derived title pool for autocomplete. "
            "Used by the answer-input combobox so guesses always resolve to "
            "a canonical title."
        ),
        tags=["titles"],
        responses={200: OpenApiResponse(description="List of {id,title,year,kind}")},
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        query = _normalize_title_query(request.query_params.get("q", ""))
        if len(query) < 2:
            return Response({"results": []})

        try:
            limit = min(int(request.query_params.get("limit", 8)), 20)
        except (TypeError, ValueError):
            limit = 8

        # Prefix match on normalized_title; fall back to substring for safety.
        qs = (
            Title.objects.filter(is_active=True)
            .filter(normalized_title__startswith=query)
            .order_by("-popularity", "canonical_title")[:limit]
        )

        if qs.count() < limit:
            extra_needed = limit - qs.count()
            substring_qs = (
                Title.objects.filter(is_active=True)
                .filter(normalized_title__contains=query)
                .exclude(id__in=qs.values("id"))
                .order_by("-popularity", "canonical_title")[:extra_needed]
            )
            results = list(qs) + list(substring_qs)
        else:
            results = list(qs)

        return Response(
            {
                "results": [
                    {
                        "id": t.id,
                        "title": t.canonical_title,
                        "year": t.year,
                        "kind": t.kind,
                    }
                    for t in results
                ]
            }
        )

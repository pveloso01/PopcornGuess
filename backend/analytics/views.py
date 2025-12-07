"""
API views for analytics and user tracking.
"""

from django.utils import timezone

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import AnonymousUser, Streak, UserProgress, UserStats
from .serializers import (
    AnonymousSyncRequestSerializer,
    AnonymousSyncResponseSerializer,
    AnonymousUserSerializer,
    StreakSerializer,
    UserProgressSerializer,
    UserStatsSerializer,
)


@extend_schema(
    summary="Register anonymous user",
    description=(
        "Generate and register a new device ID for anonymous user tracking. "
        "This allows users to play without sign-up while still tracking progress."
    ),
    tags=["anonymous"],
    responses={
        201: AnonymousUserSerializer,
        400: OpenApiResponse(description="Validation error"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
def register_anonymous_user(request):  # type: ignore[no-untyped-def]
    """Register a new anonymous user and return device ID."""
    # Check if device_id is provided in request
    serializer = AnonymousUserSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    # Create new anonymous user
    anonymous_user = AnonymousUser.objects.create(
        timezone_name=serializer.validated_data.get("timezone_name", "UTC"),
        notifications_enabled=serializer.validated_data.get(
            "notifications_enabled", False
        ),
    )

    # Create associated streak and stats
    Streak.objects.create(anonymous_user=anonymous_user)
    UserStats.objects.create(anonymous_user=anonymous_user)

    response_serializer = AnonymousUserSerializer(anonymous_user)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Sync anonymous user data",
    description=(
        "Sync progress, streaks, and stats for an anonymous user. "
        "Used to synchronize data from localStorage with the server."
    ),
    tags=["anonymous"],
    request=AnonymousSyncRequestSerializer,
    responses={
        200: AnonymousSyncResponseSerializer,
        404: OpenApiResponse(description="Anonymous user not found"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
def sync_anonymous_data(request):  # type: ignore[no-untyped-def]
    """Sync anonymous user data with server."""
    serializer = AnonymousSyncRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    device_id = serializer.validated_data["device_id"]

    try:
        anonymous_user = AnonymousUser.objects.get(device_id=device_id)
    except AnonymousUser.DoesNotExist:
        return Response(
            {"detail": "Anonymous user not found. Please register first."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Update last seen
    anonymous_user.last_seen = timezone.now()
    anonymous_user.save()

    # Get or create streak and stats
    streak, _ = Streak.objects.get_or_create(anonymous_user=anonymous_user)
    stats, _ = UserStats.objects.get_or_create(anonymous_user=anonymous_user)

    # Get recent progress
    progress = UserProgress.objects.filter(anonymous_user=anonymous_user).order_by(
        "-started_at"
    )[:10]

    # Prepare response
    response_data = {
        "device_id": device_id,
        "streak": StreakSerializer(streak).data,
        "stats": UserStatsSerializer(stats).data,
        "progress": UserProgressSerializer(progress, many=True).data,
        "synced_at": timezone.now(),
    }

    response_serializer = AnonymousSyncResponseSerializer(response_data)
    return Response(response_serializer.data)


@extend_schema(
    summary="Get current streak",
    description="Get the current streak for the authenticated or anonymous user.",
    tags=["streaks"],
    responses={
        200: StreakSerializer,
        404: OpenApiResponse(description="Streak not found"),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def get_current_streak(request):  # type: ignore[no-untyped-def]
    """Get current streak for user."""
    # Check if user is authenticated
    if request.user.is_authenticated:
        try:
            streak = Streak.objects.get(user=request.user)
        except Streak.DoesNotExist:
            streak = Streak.objects.create(user=request.user)
    else:
        # Try to get device_id from header or query param
        device_id = request.headers.get("X-Device-ID") or request.query_params.get(
            "device_id"
        )
        if not device_id:
            return Response(
                {"detail": "Device ID required for anonymous users."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            anonymous_user = AnonymousUser.objects.get(device_id=device_id)
            streak, _ = Streak.objects.get_or_create(anonymous_user=anonymous_user)
        except AnonymousUser.DoesNotExist:
            return Response(
                {"detail": "Anonymous user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    serializer = StreakSerializer(streak)
    return Response(serializer.data)


@extend_schema(
    summary="Update streak",
    description=(
        "Update streak after quiz completion. Called automatically after "
        "completing a daily quiz."
    ),
    tags=["streaks"],
    responses={
        200: StreakSerializer,
        404: OpenApiResponse(description="Streak not found"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
def update_streak(request):  # type: ignore[no-untyped-def]
    """Update streak after quiz completion."""
    # Check if user is authenticated
    if request.user.is_authenticated:
        try:
            streak = Streak.objects.get(user=request.user)
        except Streak.DoesNotExist:
            streak = Streak.objects.create(user=request.user)
    else:
        # Try to get device_id from header
        device_id = request.headers.get("X-Device-ID")
        if not device_id:
            return Response(
                {"detail": "Device ID required for anonymous users."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            anonymous_user = AnonymousUser.objects.get(device_id=device_id)
            streak, _ = Streak.objects.get_or_create(anonymous_user=anonymous_user)
        except AnonymousUser.DoesNotExist:
            return Response(
                {"detail": "Anonymous user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    # Update the streak
    completion_date = timezone.now().date()
    streak_extended = streak.update_streak(completion_date)

    serializer = StreakSerializer(streak)
    response_data = serializer.data
    response_data["streak_extended"] = streak_extended

    return Response(response_data)


@extend_schema(
    summary="Get user statistics",
    description="Get statistics for the authenticated or anonymous user.",
    tags=["analytics"],
    responses={
        200: UserStatsSerializer,
        404: OpenApiResponse(description="Stats not found"),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def get_user_stats(request):  # type: ignore[no-untyped-def]
    """Get user statistics."""
    # Check if user is authenticated
    if request.user.is_authenticated:
        stats, _ = UserStats.objects.get_or_create(user=request.user)
    else:
        # Try to get device_id from header
        device_id = request.headers.get("X-Device-ID")
        if not device_id:
            return Response(
                {"detail": "Device ID required for anonymous users."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            anonymous_user = AnonymousUser.objects.get(device_id=device_id)
            stats, _ = UserStats.objects.get_or_create(anonymous_user=anonymous_user)
        except AnonymousUser.DoesNotExist:
            return Response(
                {"detail": "Anonymous user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    serializer = UserStatsSerializer(stats)
    return Response(serializer.data)


@extend_schema(
    summary="Start quiz session",
    description="Initiate a new quiz session and create progress tracking.",
    tags=["progress"],
    responses={
        201: UserProgressSerializer,
        400: OpenApiResponse(description="Bad request"),
        404: OpenApiResponse(description="Quiz not found"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
def start_quiz_session(request):  # type: ignore[no-untyped-def]
    """Start a new quiz session."""
    from quizzes.models import Quiz

    quiz_id = request.data.get("quiz_id")
    if not quiz_id:
        return Response(
            {"detail": "quiz_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        quiz = Quiz.objects.get(id=quiz_id)
    except Quiz.DoesNotExist:
        return Response(
            {"detail": "Quiz not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Get user (authenticated or anonymous)
    anonymous_user = None
    user = None

    if request.user.is_authenticated:
        user = request.user
    else:
        device_id = request.headers.get("X-Device-ID")
        if not device_id:
            return Response(
                {"detail": "Device ID required for anonymous users."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            anonymous_user = AnonymousUser.objects.get(device_id=device_id)
        except AnonymousUser.DoesNotExist:
            return Response(
                {"detail": "Anonymous user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    # Create progress record
    progress = UserProgress.objects.create(
        anonymous_user=anonymous_user,
        user=user,
        quiz=quiz,
        total_questions=quiz.questions.count(),
    )

    serializer = UserProgressSerializer(progress)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Submit quiz progress",
    description="Update progress after each answer.",
    tags=["progress"],
    responses={
        200: UserProgressSerializer,
        404: OpenApiResponse(description="Progress not found"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
def submit_quiz_progress(request):  # type: ignore[no-untyped-def]
    """Submit answer and update progress."""
    progress_id = request.data.get("progress_id")
    answer_data = request.data.get("answer")

    if not progress_id:
        return Response(
            {"detail": "progress_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        progress = UserProgress.objects.get(id=progress_id)
    except UserProgress.DoesNotExist:
        return Response(
            {"detail": "Progress not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Update answers list
    if answer_data:
        answers = progress.answers or []
        answers.append(answer_data)
        progress.answers = answers
        progress.attempts_used += 1
        if answer_data.get("is_correct"):
            progress.score += 1
        progress.save()

    serializer = UserProgressSerializer(progress)
    return Response(serializer.data)


@extend_schema(
    summary="Complete quiz session",
    description="Finalize quiz completion and update stats.",
    tags=["progress"],
    responses={
        200: UserProgressSerializer,
        404: OpenApiResponse(description="Progress not found"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
def complete_quiz_session(request):  # type: ignore[no-untyped-def]
    """Complete quiz and update related stats."""
    progress_id = request.data.get("progress_id")
    time_taken = request.data.get("time_taken_seconds")

    if not progress_id:
        return Response(
            {"detail": "progress_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        progress = UserProgress.objects.get(id=progress_id)
    except UserProgress.DoesNotExist:
        return Response(
            {"detail": "Progress not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Mark as completed
    progress.complete()
    if time_taken:
        progress.time_taken_seconds = time_taken
        progress.save()

    # Update user stats
    if progress.user:
        stats, _ = UserStats.objects.get_or_create(user=progress.user)
    elif progress.anonymous_user:
        stats, _ = UserStats.objects.get_or_create(
            anonymous_user=progress.anonymous_user
        )
    else:
        stats = None

    if stats:
        stats.update_from_progress(progress)

    serializer = UserProgressSerializer(progress)
    return Response(serializer.data)

"""
API views for analytics and streak tracking.
"""

import uuid

from django.db import models
from django.db.models import Avg, Count
from django.utils import timezone

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from quizzes.models import DailyPuzzle, Quiz

from .models import AnonymousUser, DailyQuizStats, Streak, UserProgress, UserStats
from .serializers import (
    DailyQuizStatsSerializer,
    DeviceRegistrationSerializer,
    DeviceResponseSerializer,
    LeaderboardEntrySerializer,
    ProgressUpdateSerializer,
    StreakMilestoneSerializer,
    StreakSerializer,
    UserProgressSerializer,
    UserStatsSerializer,
)


class RegisterDeviceView(APIView):
    """Register or retrieve an anonymous device."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Register anonymous device",
        description=(
            "Register a new anonymous device or retrieve existing one. "
            "This enables tracking progress without requiring user registration, "
            "reducing friction for new users (like Wordle's approach)."
        ),
        tags=["analytics"],
        request=DeviceRegistrationSerializer,
        responses={
            200: DeviceResponseSerializer,
            201: DeviceResponseSerializer,
        },
    )
    def post(self, request):  # type: ignore[no-untyped-def]
        """Register or retrieve a device."""
        serializer = DeviceRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device_id = serializer.validated_data.get("device_id")
        timezone_name = serializer.validated_data.get("timezone_name", "UTC")

        if device_id:
            # Try to retrieve existing device
            try:
                device = AnonymousUser.objects.get(device_id=device_id)
                device.last_seen = timezone.now()
                device.save()
                return Response(
                    DeviceResponseSerializer(device).data,
                    status=status.HTTP_200_OK,
                )
            except AnonymousUser.DoesNotExist:
                pass

        # Create new device
        device = AnonymousUser.objects.create(
            device_id=device_id or uuid.uuid4(),
            timezone_name=timezone_name,
        )

        # Also create streak and stats records
        Streak.objects.create(anonymous_user=device)
        UserStats.objects.create(anonymous_user=device)

        return Response(
            DeviceResponseSerializer(device).data,
            status=status.HTTP_201_CREATED,
        )


class StreakView(APIView):
    """Get and update streak information."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get current streak",
        description=(
            "Retrieve the current streak information for a device. "
            "Streaks leverage psychological effects like loss aversion "
            "to drive daily engagement."
        ),
        tags=["analytics"],
        responses={
            200: StreakSerializer,
            404: OpenApiResponse(description="Device not found"),
        },
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Get streak for device."""
        device_id = request.headers.get("X-Device-ID")

        if not device_id:
            return Response(
                {"detail": "X-Device-ID header required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = AnonymousUser.objects.get(device_id=device_id)
            streak = Streak.objects.get(anonymous_user=device)
        except (AnonymousUser.DoesNotExist, Streak.DoesNotExist):
            return Response(
                {"detail": "Device not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = StreakSerializer(streak)
        return Response(serializer.data)

    @extend_schema(
        summary="Use a streak freeze",
        description=(
            "Use a streak freeze to protect the streak from breaking. "
            "Freezes are earned at milestones (7, 30, 100 days) and can be "
            "used when a day is missed."
        ),
        tags=["analytics"],
        responses={
            200: StreakSerializer,
            400: OpenApiResponse(description="No freezes available"),
            404: OpenApiResponse(description="Device not found"),
        },
    )
    def post(self, request):  # type: ignore[no-untyped-def]
        """Use a streak freeze for device."""
        device_id = request.headers.get("X-Device-ID")

        if not device_id:
            return Response(
                {"detail": "X-Device-ID header required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = AnonymousUser.objects.get(device_id=device_id)
            streak = Streak.objects.get(anonymous_user=device)
        except (AnonymousUser.DoesNotExist, Streak.DoesNotExist):
            return Response(
                {"detail": "Device not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if freeze is available
        if not streak._can_use_streak_freeze():
            return Response(
                {"detail": "No streak freezes available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use the freeze
        streak._use_streak_freeze()
        streak.save()

        serializer = StreakSerializer(streak)
        return Response(serializer.data)


class UserStatsView(APIView):
    """Get user statistics."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get user statistics",
        description="Retrieve aggregated statistics for a user/device.",
        tags=["analytics"],
        responses={
            200: UserStatsSerializer,
            404: OpenApiResponse(description="Device not found"),
        },
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Get stats for device."""
        device_id = request.headers.get("X-Device-ID")

        if not device_id:
            return Response(
                {"detail": "X-Device-ID header required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = AnonymousUser.objects.get(device_id=device_id)
            stats = UserStats.objects.get(anonymous_user=device)
        except (AnonymousUser.DoesNotExist, UserStats.DoesNotExist):
            return Response(
                {"detail": "Device not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)


class ProgressView(APIView):
    """Get and update quiz progress."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get quiz progress",
        description="Retrieve progress for a specific quiz.",
        tags=["analytics"],
        responses={
            200: UserProgressSerializer,
            404: OpenApiResponse(description="Progress not found"),
        },
    )
    def get(self, request, quiz_id):  # type: ignore[no-untyped-def]
        """Get progress for a quiz."""
        device_id = request.headers.get("X-Device-ID")

        if not device_id:
            return Response(
                {"detail": "X-Device-ID header required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = AnonymousUser.objects.get(device_id=device_id)
            progress = UserProgress.objects.get(
                anonymous_user=device,
                quiz_id=quiz_id,
            )
        except (AnonymousUser.DoesNotExist, UserProgress.DoesNotExist):
            return Response(
                {"detail": "Progress not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserProgressSerializer(progress)
        return Response(serializer.data)

    @extend_schema(
        summary="Update quiz progress",
        description="Save or update progress for a quiz.",
        tags=["analytics"],
        request=ProgressUpdateSerializer,
        responses={
            200: UserProgressSerializer,
            201: UserProgressSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request, quiz_id):  # type: ignore[no-untyped-def]
        """Update progress for a quiz."""
        device_id = request.headers.get("X-Device-ID")

        if not device_id:
            return Response(
                {"detail": "X-Device-ID header required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ProgressUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            device = AnonymousUser.objects.get(device_id=device_id)
        except AnonymousUser.DoesNotExist:
            return Response(
                {"detail": "Device not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response(
                {"detail": "Quiz not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get or create progress
        progress, created = UserProgress.objects.get_or_create(
            anonymous_user=device,
            quiz=quiz,
            defaults={
                "score": serializer.validated_data["score"],
                "total_questions": serializer.validated_data["total_questions"],
                "attempts_used": serializer.validated_data["attempts_used"],
                "answers": serializer.validated_data.get("answers", []),
                "time_taken_seconds": serializer.validated_data.get(
                    "time_taken_seconds"
                ),
                "is_completed": serializer.validated_data["is_completed"],
            },
        )

        if not created:
            # Update existing progress
            progress.score = serializer.validated_data["score"]
            progress.total_questions = serializer.validated_data["total_questions"]
            progress.attempts_used = serializer.validated_data["attempts_used"]
            progress.answers = serializer.validated_data.get("answers", [])
            if serializer.validated_data.get("time_taken_seconds"):
                progress.time_taken_seconds = serializer.validated_data[
                    "time_taken_seconds"
                ]
            progress.is_completed = serializer.validated_data["is_completed"]

            if progress.is_completed and not progress.completed_at:
                progress.complete()

                # Update streak
                streak = Streak.objects.get(anonymous_user=device)
                streak.update_streak()

                # Update stats
                stats = UserStats.objects.get(anonymous_user=device)
                stats.update_from_progress(progress)

                # Update daily quiz stats
                today = timezone.now().date()
                daily_stats, _ = DailyQuizStats.objects.get_or_create(
                    date=today,
                    quiz=quiz,
                )
                daily_stats.record_completion(progress.score)

            progress.save()

            # Record attempt for daily stats (even if not completed)
            today = timezone.now().date()
            daily_stats, _ = DailyQuizStats.objects.get_or_create(
                date=today,
                quiz=quiz,
            )
            if created:
                daily_stats.record_attempt()

        response_serializer = UserProgressSerializer(progress)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class LeaderboardView(APIView):
    """Get leaderboard data."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get leaderboard",
        description=("Retrieve the global leaderboard showing top players by score."),
        tags=["analytics"],
        responses={200: LeaderboardEntrySerializer(many=True)},
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Get global leaderboard."""
        device_id = request.headers.get("X-Device-ID")

        # Get top 100 by total score
        top_stats = UserStats.objects.exclude(total_score=0).order_by("-total_score")[
            :100
        ]

        leaderboard = []
        for rank, stats in enumerate(top_stats, start=1):
            # Get streak for this user
            if stats.anonymous_user:
                try:
                    streak_obj = Streak.objects.get(anonymous_user=stats.anonymous_user)
                    streak = streak_obj.current_streak
                except Streak.DoesNotExist:
                    streak = 0
                username = f"Player {str(stats.anonymous_user.device_id)[:8]}"
                is_current = str(stats.anonymous_user.device_id) == device_id
            elif stats.user:
                try:
                    streak_obj = Streak.objects.get(user=stats.user)
                    streak = streak_obj.current_streak
                except Streak.DoesNotExist:
                    streak = 0
                username = stats.user.username
                is_current = False  # Would need to check auth
            else:
                continue

            leaderboard.append(
                {
                    "rank": rank,
                    "username": username,
                    "score": stats.total_score,
                    "streak": streak,
                    "is_current_user": is_current,
                }
            )

        serializer = LeaderboardEntrySerializer(leaderboard, many=True)
        return Response(serializer.data)


class StreakMilestoneView(APIView):
    """Check for streak milestones."""

    permission_classes = [AllowAny]

    MILESTONES = {
        3: ("3-Day Streak!", "Warming Up", "streak_3"),
        7: ("One Week Streak!", "Week Warrior", "streak_7"),
        14: ("Two Week Streak!", "Dedicated Player", "streak_14"),
        30: ("One Month Streak!", "Monthly Master", "streak_30"),
        50: ("50-Day Streak!", "Half Century", "streak_50"),
        100: ("100-Day Streak!", "Century Champion", "streak_100"),
        365: ("One Year Streak!", "Legend", "streak_365"),
    }

    @extend_schema(
        summary="Check streak milestones",
        description=(
            "Check if the user has reached any streak milestones. "
            "Milestones trigger celebration animations."
        ),
        tags=["analytics"],
        responses={
            200: StreakMilestoneSerializer,
            404: OpenApiResponse(description="No milestone reached"),
        },
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Check for new streak milestones."""
        device_id = request.headers.get("X-Device-ID")

        if not device_id:
            return Response(
                {"detail": "X-Device-ID header required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = AnonymousUser.objects.get(device_id=device_id)
            streak = Streak.objects.get(anonymous_user=device)
        except (AnonymousUser.DoesNotExist, Streak.DoesNotExist):
            return Response(
                {"detail": "Device not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if current streak hits a milestone
        current = streak.current_streak
        if current in self.MILESTONES:
            message, badge_name, _ = self.MILESTONES[current]
            result = {
                "milestone": current,
                "message": message,
                "badge_name": badge_name,
                "is_new": True,  # Would check against a "seen" record
            }
            serializer = StreakMilestoneSerializer(result)
            return Response(serializer.data)

        return Response(
            {"detail": "No milestone reached."},
            status=status.HTTP_404_NOT_FOUND,
        )


class DailyStatsView(APIView):
    """Get community statistics for today's quiz."""

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get daily community stats",
        description=(
            "Retrieve aggregate statistics for today's quiz. "
            "Shows how the community performed."
        ),
        tags=["analytics"],
        responses={
            200: {"description": "Daily stats"},
            404: OpenApiResponse(description="No daily puzzle today"),
        },
    )
    def get(self, request):  # type: ignore[no-untyped-def]
        """Get today's community stats."""
        today = timezone.now().date()
        daily_puzzle = DailyPuzzle.get_today()

        if not daily_puzzle:
            return Response(
                {"detail": "No daily puzzle for today."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get or create daily stats for today's quiz
        daily_stats, _ = DailyQuizStats.objects.get_or_create(
            date=today,
            quiz=daily_puzzle.quiz,
        )

        serializer = DailyQuizStatsSerializer(daily_stats)
        return Response(serializer.data)

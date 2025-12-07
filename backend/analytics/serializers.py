"""
Serializers for analytics app.
"""

from rest_framework import serializers

from .models import AnonymousUser, Streak, UserProgress, UserStats


class AnonymousUserSerializer(serializers.ModelSerializer):
    """Serializer for anonymous user registration and tracking."""

    class Meta:
        model = AnonymousUser
        fields = [
            "device_id",
            "first_seen",
            "last_seen",
            "timezone_name",
            "notifications_enabled",
        ]
        read_only_fields = ["device_id", "first_seen", "last_seen"]


class StreakSerializer(serializers.ModelSerializer):
    """Serializer for streak data."""

    class Meta:
        model = Streak
        fields = [
            "current_streak",
            "best_streak",
            "last_played_date",
            "streak_freezes_available",
            "total_days_played",
        ]
        read_only_fields = fields


class UserStatsSerializer(serializers.ModelSerializer):
    """Serializer for user statistics."""

    accuracy = serializers.ReadOnlyField()

    class Meta:
        model = UserStats
        fields = [
            "total_quizzes_played",
            "total_quizzes_completed",
            "total_questions_answered",
            "total_correct_answers",
            "perfect_scores",
            "total_score",
            "average_score",
            "best_score",
            "accuracy",
            "fastest_completion_seconds",
            "average_completion_seconds",
            "global_rank",
        ]
        read_only_fields = fields


class UserProgressSerializer(serializers.ModelSerializer):
    """Serializer for user quiz progress."""

    percentage_score = serializers.ReadOnlyField()
    is_perfect_score = serializers.ReadOnlyField()

    class Meta:
        model = UserProgress
        fields = [
            "id",
            "quiz",
            "started_at",
            "completed_at",
            "is_completed",
            "score",
            "total_questions",
            "attempts_used",
            "answers",
            "time_taken_seconds",
            "percentage_score",
            "is_perfect_score",
        ]
        read_only_fields = [
            "id",
            "started_at",
            "percentage_score",
            "is_perfect_score",
        ]


class AnonymousSyncRequestSerializer(serializers.Serializer):
    """Serializer for anonymous user sync request."""

    device_id = serializers.UUIDField()
    progress_data = serializers.JSONField(required=False)
    streak_data = serializers.JSONField(required=False)
    stats_data = serializers.JSONField(required=False)


class AnonymousSyncResponseSerializer(serializers.Serializer):
    """Serializer for anonymous user sync response."""

    device_id = serializers.UUIDField()
    streak = StreakSerializer(required=False)
    stats = UserStatsSerializer(required=False)
    progress = UserProgressSerializer(many=True, required=False)
    synced_at = serializers.DateTimeField()

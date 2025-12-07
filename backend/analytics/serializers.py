"""
Serializers for Analytics API endpoints.
"""

from rest_framework import serializers

from .models import AnonymousUser, Streak, UserProgress, UserStats


class DeviceRegistrationSerializer(serializers.Serializer):
    """Serializer for registering a new anonymous device."""

    device_id = serializers.UUIDField(required=False, allow_null=True)
    timezone_name = serializers.CharField(max_length=50, default="UTC")


class DeviceResponseSerializer(serializers.ModelSerializer):
    """Serializer for device registration response."""

    class Meta:
        model = AnonymousUser
        fields = [
            "device_id",
            "first_seen",
            "last_seen",
            "timezone_name",
            "notifications_enabled",
        ]


class StreakSerializer(serializers.ModelSerializer):
    """Serializer for user streak data."""

    class Meta:
        model = Streak
        fields = [
            "current_streak",
            "best_streak",
            "last_played_date",
            "streak_freezes_available",
            "streak_freezes_earned",
            "total_days_played",
        ]


class UserStatsSerializer(serializers.ModelSerializer):
    """Serializer for user statistics."""

    accuracy = serializers.FloatField(read_only=True)

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
            "fastest_completion_seconds",
            "average_completion_seconds",
            "global_rank",
            "accuracy",
        ]


class UserProgressSerializer(serializers.ModelSerializer):
    """Serializer for quiz progress."""

    percentage_score = serializers.FloatField(read_only=True)
    is_perfect_score = serializers.BooleanField(read_only=True)

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


class ProgressUpdateSerializer(serializers.Serializer):
    """Serializer for updating quiz progress."""

    quiz_id = serializers.IntegerField()
    score = serializers.IntegerField(min_value=0)
    total_questions = serializers.IntegerField(min_value=1)
    attempts_used = serializers.IntegerField(min_value=0)
    answers = serializers.ListField(child=serializers.DictField(), default=list)
    time_taken_seconds = serializers.IntegerField(min_value=0, required=False)
    is_completed = serializers.BooleanField(default=False)


class LeaderboardEntrySerializer(serializers.Serializer):
    """Serializer for leaderboard entries."""

    rank = serializers.IntegerField()
    username = serializers.CharField()
    score = serializers.IntegerField()
    streak = serializers.IntegerField()
    is_current_user = serializers.BooleanField()


class DailyStatsSerializer(serializers.Serializer):
    """Serializer for daily community statistics."""

    date = serializers.DateField()
    total_players = serializers.IntegerField()
    average_score = serializers.FloatField()
    completion_rate = serializers.FloatField()
    most_common_wrong_answers = serializers.ListField(child=serializers.CharField())


class StreakMilestoneSerializer(serializers.Serializer):
    """Serializer for streak milestone celebrations."""

    milestone = serializers.IntegerField()
    message = serializers.CharField()
    badge_name = serializers.CharField()
    is_new = serializers.BooleanField()

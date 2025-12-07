"""
Admin configuration for Analytics models.
"""

from django.contrib import admin

from .models import AnonymousUser, Streak, UserProgress, UserStats


@admin.register(AnonymousUser)
class AnonymousUserAdmin(admin.ModelAdmin):
    """Admin configuration for AnonymousUser model."""

    list_display = [
        "device_id_short",
        "user",
        "first_seen",
        "last_seen",
        "notifications_enabled",
    ]
    list_filter = ["notifications_enabled", "first_seen"]
    search_fields = ["device_id", "user__username", "user__email"]
    readonly_fields = ["device_id", "first_seen", "last_seen"]
    ordering = ["-last_seen"]

    @admin.display(description="Device ID")
    def device_id_short(self, obj: AnonymousUser) -> str:
        """Return shortened device ID for display."""
        return f"{str(obj.device_id)[:8]}..."


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    """Admin configuration for UserProgress model."""

    list_display = [
        "id",
        "get_user_display",
        "quiz",
        "score",
        "total_questions",
        "percentage_display",
        "is_completed",
        "started_at",
    ]
    list_filter = ["is_completed", "started_at", "quiz__quiz_type"]
    search_fields = [
        "user__username",
        "anonymous_user__device_id",
        "quiz__title",
    ]
    readonly_fields = ["started_at", "completed_at"]
    ordering = ["-started_at"]

    @admin.display(description="User")
    def get_user_display(self, obj: UserProgress) -> str:
        """Return user or anonymous user display."""
        if obj.user:
            return obj.user.username
        elif obj.anonymous_user:
            return f"Anon: {str(obj.anonymous_user.device_id)[:8]}..."
        return "Unknown"

    @admin.display(description="Score %")
    def percentage_display(self, obj: UserProgress) -> str:
        """Return formatted percentage score."""
        return f"{obj.percentage_score:.1f}%"


@admin.register(Streak)
class StreakAdmin(admin.ModelAdmin):
    """Admin configuration for Streak model."""

    list_display = [
        "get_user_display",
        "current_streak",
        "best_streak",
        "total_days_played",
        "last_played_date",
        "streak_freezes_available",
    ]
    list_filter = ["last_played_date"]
    search_fields = ["user__username", "anonymous_user__device_id"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-current_streak"]

    @admin.display(description="User")
    def get_user_display(self, obj: Streak) -> str:
        """Return user or anonymous user display."""
        if obj.user:
            return obj.user.username
        elif obj.anonymous_user:
            return f"Anon: {str(obj.anonymous_user.device_id)[:8]}..."
        return "Unknown"


@admin.register(UserStats)
class UserStatsAdmin(admin.ModelAdmin):
    """Admin configuration for UserStats model."""

    list_display = [
        "get_user_display",
        "total_quizzes_completed",
        "total_score",
        "average_score_display",
        "accuracy_display",
        "perfect_scores",
        "global_rank",
    ]
    list_filter = ["created_at"]
    search_fields = ["user__username", "anonymous_user__device_id"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-total_score"]

    @admin.display(description="User")
    def get_user_display(self, obj: UserStats) -> str:
        """Return user or anonymous user display."""
        if obj.user:
            return obj.user.username
        elif obj.anonymous_user:
            return f"Anon: {str(obj.anonymous_user.device_id)[:8]}..."
        return "Unknown"

    @admin.display(description="Avg Score")
    def average_score_display(self, obj: UserStats) -> str:
        """Return formatted average score."""
        return f"{obj.average_score:.1f}"

    @admin.display(description="Accuracy")
    def accuracy_display(self, obj: UserStats) -> str:
        """Return formatted accuracy."""
        return f"{obj.accuracy:.1f}%"

"""
URL configuration for Analytics API.
"""

from django.urls import path

from .views import (
    DailyStatsView,
    LeaderboardView,
    ProgressView,
    RegisterDeviceView,
    StreakMilestoneView,
    StreakView,
    UserStatsView,
)

urlpatterns = [
    path("device/", RegisterDeviceView.as_view(), name="register-device"),
    path("streak/", StreakView.as_view(), name="streak"),
    path("streak/milestone/", StreakMilestoneView.as_view(), name="streak-milestone"),
    path("stats/", UserStatsView.as_view(), name="user-stats"),
    path("stats/daily/", DailyStatsView.as_view(), name="daily-stats"),
    path("progress/<int:quiz_id>/", ProgressView.as_view(), name="progress"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
]


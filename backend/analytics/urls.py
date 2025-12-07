"""
URL configuration for analytics app.
"""

from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    # Anonymous user endpoints
    path(
        "anonymous/register/",
        views.register_anonymous_user,
        name="anonymous-register",
    ),
    path(
        "anonymous/sync/",
        views.sync_anonymous_data,
        name="anonymous-sync",
    ),
    # Streak endpoints
    path(
        "streaks/current/",
        views.get_current_streak,
        name="streak-current",
    ),
    path(
        "streaks/update/",
        views.update_streak,
        name="streak-update",
    ),
    # Stats endpoints
    path(
        "stats/me/",
        views.get_user_stats,
        name="stats-me",
    ),
]

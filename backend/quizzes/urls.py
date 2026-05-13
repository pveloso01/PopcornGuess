"""
URL configuration for Quiz API.

All quiz-related endpoints are nested under `/api/v1/quizzes/...` so the
frontend's API client can reason about them as a single namespace, and so
the OpenAPI doc groups them together.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    AdminPuzzleSeedView,
    BlitzQuizView,
    CategoryViewSet,
    DailyQuizView,
    GetHintView,
    PracticeQuestionView,
    QuizResultsView,
    QuizViewSet,
    SubmitAnswerView,
    TitleAutocompleteView,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"quizzes", QuizViewSet, basename="quiz")

# Specific quiz paths declared BEFORE the router include so they aren't
# swallowed by the QuizViewSet's `<pk>` lookup converter
# (e.g. `/quizzes/daily/` would otherwise resolve to quiz pk='daily').
quiz_specific_patterns = [
    path("titles/", TitleAutocompleteView.as_view(), name="title-autocomplete"),
    path("daily/", DailyQuizView.as_view(), name="daily-quiz"),
    path("blitz/start/", BlitzQuizView.as_view(), name="blitz-quiz"),
    path(
        "practice/random/",
        PracticeQuestionView.as_view(),
        name="practice-questions",
    ),
    path("submit/", SubmitAnswerView.as_view(), name="submit-answer"),
    path("hint/", GetHintView.as_view(), name="get-hint"),
    path("results/<int:quiz_id>/", QuizResultsView.as_view(), name="quiz-results"),
    path("admin/seed/", AdminPuzzleSeedView.as_view(), name="admin-puzzle-seed"),
]

urlpatterns = [
    path("quizzes/", include(quiz_specific_patterns)),
    path("", include(router.urls)),
]

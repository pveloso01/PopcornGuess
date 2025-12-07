"""
URL configuration for Quiz API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    DailyQuizView,
    GetHintView,
    QuizResultsView,
    QuizViewSet,
    SubmitAnswerView,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"quizzes", QuizViewSet, basename="quiz")

urlpatterns = [
    path("", include(router.urls)),
    path("daily/", DailyQuizView.as_view(), name="daily-quiz"),
    path("submit/", SubmitAnswerView.as_view(), name="submit-answer"),
    path("hint/", GetHintView.as_view(), name="get-hint"),
    path("results/<int:quiz_id>/", QuizResultsView.as_view(), name="quiz-results"),
]


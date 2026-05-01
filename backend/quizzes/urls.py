"""
URL configuration for Quiz API.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
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

urlpatterns = [
    path("", include(router.urls)),
    path("daily/", DailyQuizView.as_view(), name="daily-quiz"),
    path("blitz/start/", BlitzQuizView.as_view(), name="blitz-quiz"),
    path("practice/random/", PracticeQuestionView.as_view(), name="practice-questions"),
    path("submit/", SubmitAnswerView.as_view(), name="submit-answer"),
    path("hint/", GetHintView.as_view(), name="get-hint"),
    path("results/<int:quiz_id>/", QuizResultsView.as_view(), name="quiz-results"),
    path("titles/", TitleAutocompleteView.as_view(), name="title-autocomplete"),
]

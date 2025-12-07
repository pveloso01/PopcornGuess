"""
URL configuration for users app.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import UserViewSet

app_name = "users"

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    # dj-rest-auth authentication endpoints
    path("auth/", include("dj_rest_auth.urls")),  # login, logout, password reset, etc.
    path(
        "auth/registration/", include("dj_rest_auth.registration.urls")
    ),  # registration
]

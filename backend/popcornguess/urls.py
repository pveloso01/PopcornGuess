"""
URL configuration for popcornguess project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from .health import healthcheck

urlpatterns = [
    # Health
    path("health/", healthcheck, name="health"),
    # Admin
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/", include("users.urls")),
    path("api/v1/", include("quizzes.urls")),
    path("api/v1/", include("analytics.urls")),
    # Auth (dj-rest-auth + dj-rest-auth.registration)
    path("api/v1/auth/", include("dj_rest_auth.urls")),
    path(
        "api/v1/auth/registration/",
        include("dj_rest_auth.registration.urls"),
    ),
    # Social authentication (allauth)
    path("accounts/", include("allauth.urls")),
    # OpenAPI Schema & Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

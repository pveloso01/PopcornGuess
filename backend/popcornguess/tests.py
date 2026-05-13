"""
Tests for project-level concerns: the /health/ endpoint.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestHealthEndpoint:
    URL = "/health/"

    def test_returns_200_when_db_healthy(self) -> None:
        response = APIClient().get(self.URL)
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["db"] is True

    def test_returns_503_when_db_broken(self) -> None:
        with patch("popcornguess.health.connection") as mock_connection:
            mock_connection.cursor.side_effect = RuntimeError("db is down")
            response = APIClient().get(self.URL)
        assert response.status_code == 503
        body = response.json()
        assert body["status"] == "degraded"
        assert body["db"] is False

    def test_disallows_post(self) -> None:
        response = APIClient().post(self.URL)
        assert response.status_code == 405


class TestCorsAllowsCustomHeaders:
    """
    Regression for the "Failed to fetch" CORS bug. The frontend sends
    X-Device-ID on every anonymous request and X-Service-Token on the
    admin-seed endpoint; both must be in django-cors-headers' allow
    list or the browser rejects the preflight before Django ever sees
    the call. curl bypasses CORS, which is why our smoke tests missed
    this in the first place.

    We assert against the setting directly because django-cors-headers
    only injects preflight headers through the full WSGI stack, which
    pytest's APIClient short-circuits.
    """

    def test_x_device_id_is_in_allow_headers(self) -> None:
        from django.conf import settings

        allow = {h.lower() for h in settings.CORS_ALLOW_HEADERS}
        assert "x-device-id" in allow, (
            "X-Device-ID must be in CORS_ALLOW_HEADERS or the browser "
            "rejects the preflight with 'Failed to fetch'."
        )

    def test_x_service_token_is_in_allow_headers(self) -> None:
        from django.conf import settings

        allow = {h.lower() for h in settings.CORS_ALLOW_HEADERS}
        assert "x-service-token" in allow

    def test_default_cors_headers_still_included(self) -> None:
        # We extend django-cors-headers' defaults — make sure we
        # didn't accidentally replace them.
        from django.conf import settings

        allow = {h.lower() for h in settings.CORS_ALLOW_HEADERS}
        assert {"accept", "authorization", "content-type"}.issubset(allow)

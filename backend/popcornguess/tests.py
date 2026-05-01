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

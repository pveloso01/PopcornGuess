"""
Lightweight health check endpoint.

UptimeRobot pings GET /health/ every 5 minutes. We respond 200 only when
the database is reachable. Anything heavier than that gets bucketed into
its own endpoint so this stays fast.
"""

from __future__ import annotations

from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET


@never_cache
@require_GET
def healthcheck(request):  # type: ignore[no-untyped-def]
    """Return {status, db} with HTTP 200 when healthy, 503 otherwise."""
    db_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:  # noqa: BLE001 — any DB error means unhealthy.
        db_ok = False

    payload = {
        "status": "ok" if db_ok else "degraded",
        "db": db_ok,
    }
    return JsonResponse(payload, status=200 if db_ok else 503)

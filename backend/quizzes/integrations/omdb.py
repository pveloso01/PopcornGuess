"""
OMDb (Open Movie Database) wrapper — fallback when TMDb is unavailable.

Free tier: 1000 calls/day, email-based API key. Used as the second link
in the synopsis-fallback chain after TMDb. We only request the Plot
field; anything else lives in TMDb.
"""

from __future__ import annotations

import os
import time
from typing import Any

import httpx

OMDB_BASE = "https://www.omdbapi.com"


class OMDbError(RuntimeError):
    """Any failure in an OMDb HTTP call."""


def _api_key() -> str:
    key = os.getenv("OMDB_API_KEY")
    if not key:
        raise OMDbError("OMDB_API_KEY environment variable is not set.")
    return key


def _client() -> httpx.Client:
    return httpx.Client(
        base_url=OMDB_BASE,
        timeout=httpx.Timeout(15.0),
        headers={"Accept": "application/json"},
    )


_BACKOFFS = (1.0, 2.0, 4.0)


def _request(client: httpx.Client, params: dict[str, Any]) -> dict[str, Any]:
    """GET with exponential backoff on 429/5xx (3 retries, cap 10s)."""
    last_err: str | None = None
    for attempt in range(3):
        response = client.get("/", params=params)
        if response.status_code in (429, 500, 502, 503, 504):
            retry_after = float(response.headers.get("retry-after", _BACKOFFS[attempt]))
            time.sleep(min(retry_after, 10.0))
            last_err = f"{response.status_code} {response.text[:120]}"
            continue
        if response.status_code >= 400:
            raise OMDbError(
                f"OMDb {response.status_code}: {response.text[:200]}"
            )
        return response.json()
    raise OMDbError(f"OMDb retries exhausted ({last_err})")


def fetch_overview(title: str, year: int | None = None) -> str:
    """
    Return the OMDb plot for a given title. Raises OMDbError on missing
    plot or upstream failure.
    """
    if not title:
        raise OMDbError("title is required")
    params: dict[str, Any] = {
        "apikey": _api_key(),
        "t": title,
        "plot": "full",
        "type": "movie",
    }
    if year is not None:
        params["y"] = str(year)

    with _client() as client:
        data = _request(client, params)

    if str(data.get("Response", "")).lower() == "false":
        raise OMDbError(f"OMDb miss: {data.get('Error', 'unknown')}")
    plot = str(data.get("Plot", "")).strip()
    if not plot or plot.lower() == "n/a":
        raise OMDbError(f"OMDb returned no plot for {title!r}")
    return plot


__all__ = ["OMDbError", "fetch_overview"]

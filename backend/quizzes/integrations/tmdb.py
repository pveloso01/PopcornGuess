"""
Thin TMDb (The Movie Database) wrapper.

Free tier: requires TMDB_API_KEY env var. We only hit text/JSON endpoints
(no image storage), so the runtime cost is just outbound HTTP. All
metadata is CC-BY — we credit TMDb in the site footer.

Designed for the nightly content cron (`generate_daily_puzzle`) and the
title-pool refresh (`import_titles`). Both run from GitHub Actions where
network calls are billed against GitHub's free quota, not Fly.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any, Iterable, Iterator

import httpx

from . import circuit

TMDB_BASE = "https://api.themoviedb.org/3"
_BACKOFFS = (1.0, 2.0, 4.0)


class TMDbError(RuntimeError):
    """Any failure in a TMDb HTTP call."""


@dataclass(frozen=True)
class TitleRecord:
    tmdb_id: int
    kind: str  # "movie" | "tv"
    title: str
    year: int | None
    overview: str
    popularity: float
    aliases: tuple[str, ...]


def _api_key() -> str:
    key = os.getenv("TMDB_API_KEY")
    if not key:
        raise TMDbError("TMDB_API_KEY environment variable is not set.")
    return key


def _client() -> httpx.Client:
    return httpx.Client(
        base_url=TMDB_BASE,
        timeout=httpx.Timeout(15.0),
        headers={"Accept": "application/json"},
    )


def _params(extra: dict[str, Any] | None = None) -> dict[str, Any]:
    base: dict[str, Any] = {"api_key": _api_key()}
    if extra:
        base.update(extra)
    return base


def _request(client: httpx.Client, path: str, params: dict[str, Any]) -> dict[str, Any]:
    """GET with 3 retries on 429/5xx using exponential backoff."""
    last_status: int | None = None
    for attempt in range(3):
        response = client.get(path, params=params)
        if response.status_code in (429, 500, 502, 503, 504):
            retry_after = float(response.headers.get("retry-after", _BACKOFFS[attempt]))
            time.sleep(min(retry_after, 10.0))
            last_status = response.status_code
            continue
        if response.status_code >= 400:
            raise TMDbError(
                f"TMDb {response.status_code} for {path}: {response.text[:200]}"
            )
        return response.json()
    raise TMDbError(f"TMDb retries exhausted for {path} (last={last_status})")


def _iter_popular_titles_impl(pages: int, kind: str) -> list[TitleRecord]:
    if kind not in {"movie", "tv"}:
        raise TMDbError(f"Unsupported kind: {kind!r}")

    records: list[TitleRecord] = []
    with _client() as client:
        for page in range(1, pages + 1):
            data = _request(
                client,
                f"/{kind}/popular",
                _params({"page": page, "language": "en-US"}),
            )
            for entry in data.get("results", []):
                records.append(_to_record(entry, kind))
    return records


def iter_popular_titles(
    *,
    pages: int = 5,
    kind: str = "movie",
) -> Iterator[TitleRecord]:
    """
    Stream the top `pages * 20` popular movie/tv titles. Guarded by the
    'tmdb' circuit breaker so persistent upstream failures fast-fail.
    """
    records = circuit.call("tmdb", _iter_popular_titles_impl, pages, kind)
    yield from records


def _fetch_overview_impl(tmdb_id: int, kind: str) -> str:
    if kind not in {"movie", "tv"}:
        raise TMDbError(f"Unsupported kind: {kind!r}")
    with _client() as client:
        data = _request(
            client, f"/{kind}/{tmdb_id}", _params({"language": "en-US"})
        )
    return str(data.get("overview", "")).strip()


def fetch_overview(tmdb_id: int, kind: str = "movie") -> str:
    """Return the canonical English overview text for a single title."""
    return circuit.call("tmdb", _fetch_overview_impl, tmdb_id, kind)


def _fetch_alternative_titles_impl(tmdb_id: int, kind: str) -> tuple[str, ...]:
    with _client() as client:
        data = _request(
            client, f"/{kind}/{tmdb_id}/alternative_titles", _params()
        )
    items = data.get("titles") or data.get("results") or []
    return tuple(
        str(item.get("title")).strip()
        for item in items
        if item.get("title")
    )


def fetch_alternative_titles(
    tmdb_id: int, kind: str = "movie"
) -> tuple[str, ...]:
    """Return alternate titles a player might type (US/UK/etc.)."""
    return circuit.call("tmdb", _fetch_alternative_titles_impl, tmdb_id, kind)


def _to_record(entry: dict[str, Any], kind: str) -> TitleRecord:
    if kind == "movie":
        title = str(entry.get("title") or entry.get("original_title") or "")
        year_str = str(entry.get("release_date", ""))[:4]
    else:  # tv
        title = str(entry.get("name") or entry.get("original_name") or "")
        year_str = str(entry.get("first_air_date", ""))[:4]

    year: int | None
    try:
        year = int(year_str) if year_str else None
    except ValueError:
        year = None

    return TitleRecord(
        tmdb_id=int(entry["id"]),
        kind=kind,
        title=title.strip(),
        year=year,
        overview=str(entry.get("overview", "")).strip(),
        popularity=float(entry.get("popularity", 0.0)),
        aliases=(),
    )


def normalize(title: str) -> str:
    """
    Lowercase + collapse internal whitespace; used as Title.normalized_title.
    Diacritic stripping is intentionally skipped at the Python layer — the
    DB column is collated case-insensitive enough for autocomplete.
    """
    return " ".join(title.lower().strip().split())


__all__ = [
    "TitleRecord",
    "TMDbError",
    "fetch_alternative_titles",
    "fetch_overview",
    "iter_popular_titles",
    "normalize",
]


def chunk(items: Iterable[TitleRecord], size: int) -> Iterator[list[TitleRecord]]:
    bucket: list[TitleRecord] = []
    for item in items:
        bucket.append(item)
        if len(bucket) >= size:
            yield bucket
            bucket = []
    if bucket:
        yield bucket

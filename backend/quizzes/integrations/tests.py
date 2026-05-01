"""
Tests for the TMDb + Gemini integration wrappers.

We never hit the real network: pytest-httpx intercepts all httpx calls.
The goal is to lock in the schema-validation, leak-detection, and
retry-on-429 behaviours that catch real production bugs.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from . import gemini, tmdb


# ──────────────────────────────────────────────────────────────────────────
# tmdb.py
# ──────────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _api_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every test runs as if the keys are configured."""
    monkeypatch.setenv("TMDB_API_KEY", "test-tmdb-key")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")


class TestTmdbNormalize:
    def test_lowercases(self) -> None:
        assert tmdb.normalize("The Matrix") == "the matrix"

    def test_collapses_whitespace(self) -> None:
        assert tmdb.normalize("   The   Matrix   ") == "the matrix"

    def test_idempotent(self) -> None:
        once = tmdb.normalize("The   Matrix")
        twice = tmdb.normalize(once)
        assert once == twice


class TestTmdbApiKey:
    def test_raises_when_missing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("TMDB_API_KEY", raising=False)
        with pytest.raises(tmdb.TMDbError):
            tmdb._api_key()


def _tmdb_movie_page(page: int) -> dict[str, Any]:
    return {
        "page": page,
        "results": [
            {
                "id": 1000 + page,
                "title": f"Sample Movie {page}",
                "release_date": "2020-01-01",
                "overview": f"Synopsis {page}",
                "popularity": 50.0 - page,
            }
        ],
    }


class TestIterPopularTitles:
    def test_streams_pages(self, httpx_mock) -> None:
        httpx_mock.add_response(
            url=httpx.URL(
                f"{tmdb.TMDB_BASE}/movie/popular",
                params={"api_key": "test-tmdb-key", "page": 1, "language": "en-US"},
            ),
            json=_tmdb_movie_page(1),
        )
        httpx_mock.add_response(
            url=httpx.URL(
                f"{tmdb.TMDB_BASE}/movie/popular",
                params={"api_key": "test-tmdb-key", "page": 2, "language": "en-US"},
            ),
            json=_tmdb_movie_page(2),
        )

        results = list(tmdb.iter_popular_titles(pages=2, kind="movie"))
        assert [r.tmdb_id for r in results] == [1001, 1002]
        assert results[0].title == "Sample Movie 1"

    def test_unknown_kind_raises(self) -> None:
        with pytest.raises(tmdb.TMDbError):
            list(tmdb.iter_popular_titles(pages=1, kind="podcast"))

    def test_retries_on_429(self, httpx_mock) -> None:
        # First response: 429. Second response: 200.
        httpx_mock.add_response(
            url=httpx.URL(
                f"{tmdb.TMDB_BASE}/movie/popular",
                params={"api_key": "test-tmdb-key", "page": 1, "language": "en-US"},
            ),
            status_code=429,
            headers={"Retry-After": "0"},
        )
        httpx_mock.add_response(
            url=httpx.URL(
                f"{tmdb.TMDB_BASE}/movie/popular",
                params={"api_key": "test-tmdb-key", "page": 1, "language": "en-US"},
            ),
            json=_tmdb_movie_page(1),
        )

        results = list(tmdb.iter_popular_titles(pages=1, kind="movie"))
        assert len(results) == 1

    def test_4xx_raises_tmdb_error(self, httpx_mock) -> None:
        httpx_mock.add_response(
            url=httpx.URL(
                f"{tmdb.TMDB_BASE}/movie/popular",
                params={"api_key": "test-tmdb-key", "page": 1, "language": "en-US"},
            ),
            status_code=403,
            text="forbidden",
        )
        with pytest.raises(tmdb.TMDbError):
            list(tmdb.iter_popular_titles(pages=1, kind="movie"))


class TestFetchOverview:
    def test_returns_text(self, httpx_mock) -> None:
        httpx_mock.add_response(
            url=httpx.URL(
                f"{tmdb.TMDB_BASE}/movie/27205",
                params={"api_key": "test-tmdb-key", "language": "en-US"},
            ),
            json={"overview": "A thief who steals corporate secrets…"},
        )
        result = tmdb.fetch_overview(27205, kind="movie")
        assert result.startswith("A thief")


# ──────────────────────────────────────────────────────────────────────────
# gemini.py
# ──────────────────────────────────────────────────────────────────────────


def _gemini_response(text: str) -> dict[str, Any]:
    return {
        "candidates": [
            {"content": {"parts": [{"text": text}]}}
        ]
    }


def _valid_ladder_payload(title: str = "Inception") -> dict[str, Any]:
    return {
        "rungs": [
            "A thief who steals secrets through dream-sharing technology faces an existential heist.",
            "He's offered a chance at redemption with the most dangerous job of his career.",
            "The team must pull off the impossible: planting an idea inside someone's mind.",
            "Levels of consciousness stack like Russian dolls, each more unstable than the last.",
            "Time dilates as the layers compound, and the line between reality and dream blurs.",
            "A dying old man, a spinning top, and a question of what's real haunts the closing frame.",
        ],
        "aliases": [title, "Inception (2010)"],
    }


class TestGeminiGenerateLadder:
    def test_happy_path(self, httpx_mock) -> None:
        payload = _valid_ladder_payload()
        httpx_mock.add_response(
            method="POST",
            json=_gemini_response(json.dumps(payload)),
        )
        ladder = gemini.generate_ladder(
            title="Inception",
            year=2010,
            synopsis="A thief enters dreams to plant an idea inside a target's mind.",
            kind="movie",
        )
        assert len(ladder.rungs) == 6
        assert "Inception" in ladder.aliases

    def test_invalid_json_raises(self, httpx_mock) -> None:
        httpx_mock.add_response(
            method="POST",
            json=_gemini_response("not json at all"),
        )
        with pytest.raises(gemini.GeminiError):
            gemini.generate_ladder(
                title="Inception",
                year=2010,
                synopsis="A thief who steals secrets through dream-sharing tech.",
                kind="movie",
            )

    def test_schema_violation_too_few_rungs(self, httpx_mock) -> None:
        bad = _valid_ladder_payload()
        bad["rungs"] = bad["rungs"][:5]  # only 5 rungs
        httpx_mock.add_response(
            method="POST",
            json=_gemini_response(json.dumps(bad)),
        )
        with pytest.raises(gemini.GeminiError):
            gemini.generate_ladder(
                title="Inception",
                year=2010,
                synopsis="A thief enters dreams to plant an idea inside a target's mind.",
                kind="movie",
            )

    def test_leak_detection_rejects_title_in_rung(self, httpx_mock) -> None:
        bad = _valid_ladder_payload()
        bad["rungs"][2] = "The film Inception explores a heist inside a dream."
        httpx_mock.add_response(
            method="POST",
            json=_gemini_response(json.dumps(bad)),
        )
        with pytest.raises(gemini.GeminiError, match="leaks the title"):
            gemini.generate_ladder(
                title="Inception",
                year=2010,
                synopsis="A thief enters dreams to plant an idea inside a target's mind.",
                kind="movie",
            )

    def test_alias_auto_injected_when_missing(self, httpx_mock) -> None:
        bad = _valid_ladder_payload()
        bad["aliases"] = ["Some Other Name", "Not The Title"]
        httpx_mock.add_response(
            method="POST",
            json=_gemini_response(json.dumps(bad)),
        )
        ladder = gemini.generate_ladder(
            title="Inception",
            year=2010,
            synopsis="A thief enters dreams to plant an idea inside a target's mind.",
            kind="movie",
        )
        assert "Inception" in ladder.aliases

    def test_code_fence_stripping(self, httpx_mock) -> None:
        payload = _valid_ladder_payload()
        wrapped = f"```json\n{json.dumps(payload)}\n```"
        httpx_mock.add_response(method="POST", json=_gemini_response(wrapped))
        ladder = gemini.generate_ladder(
            title="Inception",
            year=2010,
            synopsis="A thief enters dreams to plant an idea inside a target's mind.",
            kind="movie",
        )
        assert len(ladder.rungs) == 6

    def test_short_synopsis_pre_check(self) -> None:
        with pytest.raises(gemini.GeminiError, match="too short"):
            gemini.generate_ladder(
                title="X",
                year=2024,
                synopsis="hi",
                kind="movie",
            )

    def test_oversized_rung_fails_schema(self, httpx_mock) -> None:
        bad = _valid_ladder_payload()
        bad["rungs"][0] = "a" * 500  # over the 280 cap
        httpx_mock.add_response(method="POST", json=_gemini_response(json.dumps(bad)))
        with pytest.raises(gemini.GeminiError):
            gemini.generate_ladder(
                title="Inception",
                year=2010,
                synopsis="A thief enters dreams to plant an idea inside a target's mind.",
                kind="movie",
            )


class TestBuildPrompt:
    def test_includes_title_and_synopsis(self) -> None:
        prompt = gemini.build_prompt(
            title="Inception",
            year=2010,
            synopsis="A thief enters dreams.",
            kind="movie",
        )
        assert "Inception" in prompt
        assert "2010" in prompt
        assert "movie" in prompt

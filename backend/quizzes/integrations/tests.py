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

from . import circuit, gemini, omdb, tmdb, wikidata


# ──────────────────────────────────────────────────────────────────────────
# tmdb.py
# ──────────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _api_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every test runs as if the keys are configured."""
    monkeypatch.setenv("TMDB_API_KEY", "test-tmdb-key")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("OMDB_API_KEY", "test-omdb-key")


@pytest.fixture(autouse=True)
def _reset_circuits() -> None:
    """Always start each test with fresh circuit state."""
    circuit.reset()
    yield
    circuit.reset()


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch time.sleep across all integration modules to keep tests fast."""
    monkeypatch.setattr(tmdb.time, "sleep", lambda _s: None)
    monkeypatch.setattr(gemini.time, "sleep", lambda _s: None)
    monkeypatch.setattr(omdb.time, "sleep", lambda _s: None)
    monkeypatch.setattr(wikidata.time, "sleep", lambda _s: None)


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
        result = gemini.generate_ladder(
            title="Inception",
            year=2010,
            synopsis="A thief who steals secrets through dream-sharing technology faces an existential heist.",
            kind="movie",
        )
        ladder, raw = result
        assert len(ladder.rungs) == 6
        assert "Inception" in ladder.aliases
        assert ladder.prompt_version == gemini.PROMPT_VERSION
        # The full raw response dict is exposed for auditing.
        assert "candidates" in raw

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
        ladder, _ = gemini.generate_ladder(
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
        ladder, _ = gemini.generate_ladder(
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


# ──────────────────────────────────────────────────────────────────────────
# circuit.py
# ──────────────────────────────────────────────────────────────────────────


class TestCircuit:
    def test_success_resets_failures(self) -> None:
        calls = {"n": 0}

        def fn() -> str:
            calls["n"] += 1
            return "ok"

        assert circuit.call("svc-a", fn, threshold=3) == "ok"
        assert circuit._get("svc-a").failures == 0

    def test_opens_after_threshold(self) -> None:
        def boom() -> None:
            raise RuntimeError("nope")

        for _ in range(3):
            with pytest.raises(RuntimeError):
                circuit.call("svc-b", boom, threshold=3, cooldown_seconds=600)

        with pytest.raises(circuit.CircuitOpenError):
            circuit.call("svc-b", boom, threshold=3, cooldown_seconds=600)

    def test_half_open_after_cooldown_success_resets(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        now = {"t": 1000.0}
        monkeypatch.setattr(circuit.time, "monotonic", lambda: now["t"])

        def boom() -> None:
            raise RuntimeError("nope")

        def good() -> str:
            return "ok"

        for _ in range(2):
            with pytest.raises(RuntimeError):
                circuit.call("svc-c", boom, threshold=2, cooldown_seconds=10)

        with pytest.raises(circuit.CircuitOpenError):
            circuit.call("svc-c", boom, threshold=2, cooldown_seconds=10)

        now["t"] += 20
        assert circuit.call("svc-c", good, threshold=2, cooldown_seconds=10) == "ok"
        assert circuit._get("svc-c").failures == 0
        assert circuit._get("svc-c").opened_at is None

    def test_reset_clears_named(self) -> None:
        def boom() -> None:
            raise RuntimeError("nope")

        with pytest.raises(RuntimeError):
            circuit.call("svc-d", boom, threshold=1, cooldown_seconds=600)
        with pytest.raises(circuit.CircuitOpenError):
            circuit.call("svc-d", boom, threshold=1, cooldown_seconds=600)

        circuit.reset("svc-d")
        with pytest.raises(RuntimeError):
            circuit.call("svc-d", boom, threshold=5, cooldown_seconds=600)


# ──────────────────────────────────────────────────────────────────────────
# omdb.py
# ──────────────────────────────────────────────────────────────────────────


class TestOmdb:
    def test_fetch_overview_returns_plot(self, httpx_mock) -> None:
        httpx_mock.add_response(
            url=httpx.URL(
                f"{omdb.OMDB_BASE}/",
                params={
                    "apikey": "test-omdb-key",
                    "t": "Inception",
                    "plot": "full",
                    "type": "movie",
                    "y": "2010",
                },
            ),
            json={"Response": "True", "Plot": "Dreams within dreams."},
        )
        assert omdb.fetch_overview("Inception", year=2010) == "Dreams within dreams."

    def test_missing_api_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("OMDB_API_KEY", raising=False)
        with pytest.raises(omdb.OMDbError):
            omdb.fetch_overview("Inception")

    def test_empty_title_raises(self) -> None:
        with pytest.raises(omdb.OMDbError):
            omdb.fetch_overview("")

    def test_4xx_raises(self, httpx_mock) -> None:
        httpx_mock.add_response(status_code=403, text="forbidden")
        with pytest.raises(omdb.OMDbError):
            omdb.fetch_overview("Inception")

    def test_retries_then_succeeds(self, httpx_mock) -> None:
        httpx_mock.add_response(status_code=503, headers={"Retry-After": "0"})
        httpx_mock.add_response(
            json={"Response": "True", "Plot": "Recovered."},
        )
        assert omdb.fetch_overview("Inception") == "Recovered."

    def test_retries_exhausted(self, httpx_mock) -> None:
        for _ in range(3):
            httpx_mock.add_response(status_code=502, headers={"Retry-After": "0"})
        with pytest.raises(omdb.OMDbError, match="retries exhausted"):
            omdb.fetch_overview("Inception")

    def test_response_false_raises(self, httpx_mock) -> None:
        httpx_mock.add_response(json={"Response": "False", "Error": "Movie not found!"})
        with pytest.raises(omdb.OMDbError, match="miss"):
            omdb.fetch_overview("Nope")

    def test_missing_plot_raises(self, httpx_mock) -> None:
        httpx_mock.add_response(json={"Response": "True", "Plot": "N/A"})
        with pytest.raises(omdb.OMDbError, match="no plot"):
            omdb.fetch_overview("Nope")


# ──────────────────────────────────────────────────────────────────────────
# wikidata.py
# ──────────────────────────────────────────────────────────────────────────


def _wikidata_response(description: str) -> dict[str, Any]:
    return {
        "results": {
            "bindings": [
                {
                    "item": {"value": "http://www.wikidata.org/entity/Q123"},
                    "description": {"value": description},
                }
            ]
        }
    }


class TestWikidata:
    def test_fetch_overview_returns_description(self, httpx_mock) -> None:
        httpx_mock.add_response(
            json=_wikidata_response("2010 film by Christopher Nolan")
        )
        result = wikidata.fetch_overview("Inception", year=2010)
        assert "Nolan" in result

    def test_empty_title_raises(self) -> None:
        with pytest.raises(wikidata.WikidataError):
            wikidata.fetch_overview("")

    def test_4xx_raises(self, httpx_mock) -> None:
        httpx_mock.add_response(status_code=400, text="bad query")
        with pytest.raises(wikidata.WikidataError):
            wikidata.fetch_overview("Inception")

    def test_no_bindings_raises(self, httpx_mock) -> None:
        httpx_mock.add_response(json={"results": {"bindings": []}})
        with pytest.raises(wikidata.WikidataError, match="miss"):
            wikidata.fetch_overview("Nope")

    def test_empty_description_raises(self, httpx_mock) -> None:
        httpx_mock.add_response(json=_wikidata_response(""))
        with pytest.raises(wikidata.WikidataError, match="no description"):
            wikidata.fetch_overview("Inception")

    def test_retries_on_5xx(self, httpx_mock) -> None:
        httpx_mock.add_response(status_code=503, headers={"Retry-After": "0"})
        httpx_mock.add_response(json=_wikidata_response("recovered"))
        assert wikidata.fetch_overview("Inception") == "recovered"

    def test_retries_exhausted(self, httpx_mock) -> None:
        for _ in range(3):
            httpx_mock.add_response(status_code=502, headers={"Retry-After": "0"})
        with pytest.raises(wikidata.WikidataError, match="exhausted"):
            wikidata.fetch_overview("Inception")


# ──────────────────────────────────────────────────────────────────────────
# tmdb retry-3 + gemini retry-3
# ──────────────────────────────────────────────────────────────────────────


class TestTmdbRetry:
    def test_three_retries_then_succeed(self, httpx_mock) -> None:
        url = httpx.URL(
            f"{tmdb.TMDB_BASE}/movie/27205",
            params={"api_key": "test-tmdb-key", "language": "en-US"},
        )
        httpx_mock.add_response(url=url, status_code=503, headers={"Retry-After": "0"})
        httpx_mock.add_response(url=url, status_code=502, headers={"Retry-After": "0"})
        httpx_mock.add_response(url=url, json={"overview": "Recovered."})
        assert tmdb.fetch_overview(27205) == "Recovered."

    def test_retries_exhausted(self, httpx_mock) -> None:
        url = httpx.URL(
            f"{tmdb.TMDB_BASE}/movie/27205",
            params={"api_key": "test-tmdb-key", "language": "en-US"},
        )
        for _ in range(3):
            httpx_mock.add_response(url=url, status_code=502, headers={"Retry-After": "0"})
        with pytest.raises(tmdb.TMDbError, match="exhausted"):
            tmdb.fetch_overview(27205)


class TestGeminiRetry:
    def test_three_retries_then_success(self, httpx_mock) -> None:
        payload = _valid_ladder_payload()
        httpx_mock.add_response(
            method="POST", status_code=503, headers={"Retry-After": "0"}
        )
        httpx_mock.add_response(
            method="POST", status_code=502, headers={"Retry-After": "0"}
        )
        httpx_mock.add_response(
            method="POST", json=_gemini_response(json.dumps(payload))
        )
        ladder, raw = gemini.generate_ladder(
            title="Inception",
            year=2010,
            synopsis="A thief enters dreams to plant an idea inside a target's mind.",
            kind="movie",
        )
        assert ladder.prompt_version == gemini.PROMPT_VERSION
        assert raw["candidates"]


class TestGeminiModelName:
    def test_default_model_name(self) -> None:
        assert gemini.model_name() == "gemini-1.5-flash"

    def test_overridable_via_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
        assert gemini.model_name() == "gemini-2.5-flash"

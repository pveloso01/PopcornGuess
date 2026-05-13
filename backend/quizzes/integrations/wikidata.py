"""
Wikidata SPARQL wrapper — third-tier fallback for overviews.

Free, no key. Slower and lower quality than TMDb/OMDb but always
available — perfect last-resort source. We look up the item by label
(English) and optional year and return its `schema:description`.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

WIKIDATA_BASE = "https://query.wikidata.org/sparql"
USER_AGENT = "PopcornGuess/1.0 (https://popcornguess.com; ops@popcornguess.com)"


class WikidataError(RuntimeError):
    """Any failure in a Wikidata SPARQL call."""


def _client() -> httpx.Client:
    return httpx.Client(
        timeout=httpx.Timeout(20.0),
        headers={
            "Accept": "application/sparql-results+json",
            "User-Agent": USER_AGENT,
        },
    )


_BACKOFFS = (1.0, 2.0, 4.0)


def _build_query(title: str, year: int | None) -> str:
    safe_title = title.replace('"', '\\"')
    year_filter = ""
    if year is not None:
        year_filter = (
            f'  ?item wdt:P577 ?published .\n'
            f'  FILTER(YEAR(?published) = {int(year)})\n'
        )
    return (
        "SELECT ?item ?description WHERE {\n"
        f'  ?item rdfs:label "{safe_title}"@en .\n'
        "  ?item wdt:P31/wdt:P279* wd:Q11424 .\n"  # film or subclass
        f"{year_filter}"
        '  ?item schema:description ?description .\n'
        '  FILTER(LANG(?description) = "en")\n'
        "} LIMIT 1"
    )


def _request(client: httpx.Client, query: str) -> dict[str, Any]:
    last_err: str | None = None
    for attempt in range(3):
        response = client.get(WIKIDATA_BASE, params={"query": query, "format": "json"})
        if response.status_code in (429, 500, 502, 503, 504):
            retry_after = float(response.headers.get("retry-after", _BACKOFFS[attempt]))
            time.sleep(min(retry_after, 10.0))
            last_err = f"{response.status_code}"
            continue
        if response.status_code >= 400:
            raise WikidataError(
                f"Wikidata {response.status_code}: {response.text[:200]}"
            )
        return response.json()
    raise WikidataError(f"Wikidata retries exhausted ({last_err})")


def fetch_overview(title: str, year: int | None = None) -> str:
    """
    Return the English schema:description for a film/TV item with the
    given label. Raises WikidataError if nothing matches.
    """
    if not title:
        raise WikidataError("title is required")
    query = _build_query(title, year)
    with _client() as client:
        data = _request(client, query)

    bindings = data.get("results", {}).get("bindings", [])
    if not bindings:
        raise WikidataError(f"Wikidata miss for {title!r}")
    description = str(bindings[0].get("description", {}).get("value", "")).strip()
    if not description:
        raise WikidataError(f"Wikidata returned no description for {title!r}")
    return description


__all__ = ["WikidataError", "fetch_overview"]

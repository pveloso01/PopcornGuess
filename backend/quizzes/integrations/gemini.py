"""
Google Gemini Flash wrapper for puzzle clue generation.

Free tier: requires GEMINI_API_KEY. Generous quota (1500 req/day on
Flash). We constrain the model to JSON output and validate against a
strict schema before persisting.

The generated puzzle is a 6-rung "synopsis ladder": rung 1 is the most
abstract themed sentence; rung 6 is the closest paraphrase of the TMDb
synopsis. The model also returns 4-6 answer aliases.
"""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any

import httpx
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError

from . import circuit

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
PROMPT_VERSION = "v1"
_BACKOFFS = (1.0, 2.0, 4.0)


class GeminiError(RuntimeError):
    """Any failure in a Gemini call or validation."""


PUZZLE_SCHEMA: dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["rungs", "aliases"],
    "properties": {
        "rungs": {
            "type": "array",
            "minItems": 6,
            "maxItems": 6,
            "items": {
                "type": "string",
                "minLength": 24,
                "maxLength": 280,
            },
        },
        "aliases": {
            "type": "array",
            "minItems": 2,
            "maxItems": 8,
            "items": {"type": "string", "minLength": 1, "maxLength": 120},
        },
    },
    "additionalProperties": False,
}

_VALIDATOR = Draft202012Validator(PUZZLE_SCHEMA)


@dataclass(frozen=True)
class LadderPuzzle:
    rungs: list[str]
    aliases: list[str]
    prompt_version: str = PROMPT_VERSION


def _api_key() -> str:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise GeminiError("GEMINI_API_KEY environment variable is not set.")
    return key


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


def model_name() -> str:
    """Public accessor for the currently configured Gemini model id."""
    return _model_name()


def build_prompt(*, title: str, year: int | None, synopsis: str, kind: str) -> str:
    return (
        "You are writing a six-rung clue ladder for a daily Wordle-style "
        "puzzle. The answer is the title below. Write rungs that get more "
        "specific each step.\n\n"
        f"Title: {title}\n"
        f"Year: {year if year else 'unknown'}\n"
        f"Kind: {'TV show' if kind == 'tv' else 'movie'}\n"
        f"Source synopsis (paraphrase, never quote verbatim):\n{synopsis.strip()}\n\n"
        "Rules:\n"
        "1. NEVER include the title or unique character names (anything that "
        "directly gives away the answer).\n"
        "2. Rung 1 is broad theme/tone (e.g. 'A heist gone wrong in a "
        "neon-lit metropolis'). Rung 6 is a tight paraphrase of the official "
        "synopsis but still without the title.\n"
        "3. Each rung is one sentence, 24–280 characters, original prose.\n"
        "4. Provide 2–8 acceptable answer aliases (abbreviations, sequels' "
        "joint title, common alternate spellings). Always include the canonical title.\n"
        "5. Respond with ONLY a single JSON object, no markdown fences.\n"
        '6. Format: {"rungs": ["...","...","...","...","...","..."], '
        '"aliases": ["...", "..."]}'
    )


def _request_impl(prompt: str) -> tuple[str, dict[str, Any]]:
    """Call Gemini and return (text, full raw response dict)."""
    url = f"{GEMINI_BASE}/models/{_model_name()}:generateContent?key={_api_key()}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.9,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
        },
        "safetySettings": [
            {
                "category": cat,
                "threshold": "BLOCK_ONLY_HIGH",
            }
            for cat in (
                "HARM_CATEGORY_HARASSMENT",
                "HARM_CATEGORY_HATE_SPEECH",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "HARM_CATEGORY_DANGEROUS_CONTENT",
            )
        ],
    }

    last_status: int | None = None
    with httpx.Client(timeout=httpx.Timeout(30.0)) as client:
        for attempt in range(3):
            response = client.post(url, json=payload)
            if response.status_code in (429, 500, 502, 503, 504):
                retry_after = float(response.headers.get("retry-after", _BACKOFFS[attempt]))
                time.sleep(min(retry_after, 10.0))
                last_status = response.status_code
                continue
            if response.status_code >= 400:
                raise GeminiError(
                    f"Gemini {response.status_code}: {response.text[:300]}"
                )
            data = response.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as exc:
                raise GeminiError(f"Gemini returned no candidate: {data}") from exc
            return text, data
    raise GeminiError(f"Gemini retries exhausted (last={last_status})")


def _request(prompt: str) -> tuple[str, dict[str, Any]]:
    """Circuit-guarded entry point."""
    return circuit.call("gemini", _request_impl, prompt)


_FENCE_RE = re.compile(r"^```(?:json)?\s*(.+?)\s*```\s*$", re.DOTALL)


def _strip_code_fence(text: str) -> str:
    match = _FENCE_RE.match(text.strip())
    return match.group(1) if match else text


def generate_ladder(
    *, title: str, year: int | None, synopsis: str, kind: str = "movie"
) -> tuple[LadderPuzzle, dict[str, Any]]:
    """
    Generate, validate, and return (LadderPuzzle, raw_response_dict). The
    second element is the full parsed JSON body Gemini returned (before
    schema validation of the inner content) — persisted for auditing.

    Raises GeminiError if the response is malformed or the answer leaks.
    """
    if not synopsis or len(synopsis) < 30:
        raise GeminiError(f"Synopsis too short for {title!r}; aborting generation.")

    raw_text, raw_response = _request(
        build_prompt(title=title, year=year, synopsis=synopsis, kind=kind)
    )
    try:
        parsed = json.loads(_strip_code_fence(raw_text))
    except json.JSONDecodeError as exc:
        raise GeminiError(f"Gemini returned invalid JSON: {raw_text[:300]}") from exc

    try:
        _VALIDATOR.validate(parsed)
    except ValidationError as exc:
        raise GeminiError(f"Schema mismatch: {exc.message}") from exc

    rungs: list[str] = parsed["rungs"]
    aliases: list[str] = parsed["aliases"]

    leak = title.lower()
    for i, rung in enumerate(rungs):
        if leak in rung.lower():
            raise GeminiError(
                f"Rung {i + 1} leaks the title verbatim — regenerate."
            )

    if not any(a.lower().strip() == title.lower().strip() for a in aliases):
        aliases.append(title)

    ladder = LadderPuzzle(
        rungs=list(rungs),
        aliases=list(aliases),
        prompt_version=PROMPT_VERSION,
    )
    return ladder, raw_response


__all__ = [
    "GeminiError",
    "LadderPuzzle",
    "PROMPT_VERSION",
    "PUZZLE_SCHEMA",
    "build_prompt",
    "generate_ladder",
]

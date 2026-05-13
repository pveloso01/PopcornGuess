# PopcornGuess — Daily Content Pipeline

How a fresh puzzle reaches `/quiz/daily` every morning without anyone
touching anything.

---

## The 60-second tour

```
┌──────────────────────────────────────────────────────────┐
│ GitHub Actions cron @ 00:30 UTC                          │
│   .github/workflows/generate-puzzle.yml                  │
└────────────────────────┬─────────────────────────────────┘
                         │ flyctl ssh console
                         ▼
┌──────────────────────────────────────────────────────────┐
│ Fly.io machine (popcornguess-api)                        │
│   python manage.py generate_daily_puzzle                 │
│   ├── pick eligible Title (DB)                           │
│   ├── fetch overview (TMDb)                              │
│   ├── generate 6-rung ladder + aliases (Gemini)          │
│   ├── validate (jsonschema, leak-check)                  │
│   └── write Quiz + Question + DailyPuzzle (Neon)         │
└──────────────────────────────────────────────────────────┘
                         │ on failure
                         ▼
        GitHub issue tagged `puzzle-error`
        with run link + recovery steps
```

---

## Components

| File | Role |
|---|---|
| `.github/workflows/generate-puzzle.yml` | Cron + invocation (00:30 UTC primary + 23:00 UTC hot-spare) |
| `.github/workflows/refresh-titles.yml`  | Weekly title-pool refresh |
| `backend/quizzes/integrations/tmdb.py`  | TMDb HTTP wrapper (3 retries + circuit breaker) |
| `backend/quizzes/integrations/omdb.py`  | OMDb fallback (tier 2) |
| `backend/quizzes/integrations/wikidata.py` | Wikidata SPARQL fallback (tier 3) |
| `backend/quizzes/integrations/circuit.py` | In-memory circuit breaker shared across integrations |
| `backend/quizzes/integrations/gemini.py`| Gemini wrapper, returns `(LadderPuzzle, raw_response)` |
| `backend/quizzes/management/commands/generate_daily_puzzle.py` | Pipeline entry point |
| `backend/quizzes/management/commands/backfill_daily_puzzles.py` | N-day bulk backfill |
| `backend/quizzes/management/commands/import_titles.py`         | Pool refresh entry point |
| `POST /api/v1/quizzes/admin/seed/`      | Manual operator override (service-token auth) |

## Reliability layers

1. **Per-source retry** — TMDb / OMDb / Wikidata / Gemini each retry 3
   times with exponential backoff (1s, 2s, 4s; capped at 10s).
2. **Circuit breaker** — opens after 5 consecutive failures of a named
   upstream, fast-fails for 10 minutes, then half-opens for a probe.
3. **Overview fallback chain** — TMDb → OMDb → Wikidata. Only when all
   three fail back-to-back does the generator surface a `CommandError`.
4. **Hot-spare cron** — a second GitHub Actions run at 23:00 UTC
   pre-generates `now+2` so a primary 00:30 UTC failure does not result
   in an empty `/daily` endpoint the next morning.
5. **Audit trail** — every `DailyPuzzle` row stores the full Gemini
   response, prompt version, model id, and a SHA-256 of the source
   synopsis, for post-mortem and prompt A/B work.
6. **Admin override** — operators can `POST` a hand-built ladder to
   `/api/v1/quizzes/admin/seed/` when everything else is down.
7. **Bulk backfill** — `manage.py backfill_daily_puzzles --days 90`
   pre-builds a buffer so the daily cron has slack.

---

## Title selection

`generate_daily_puzzle` picks the title with the highest `popularity`
that has **not** been the answer in the last 365 days. Slugs are tagged
`tmdb-<id>-<slug>` so the lookback query is a string match against
`Quiz.slug`.

To force a specific title:

```bash
python manage.py generate_daily_puzzle --tmdb-id 27205
```

To preview without writing:

```bash
python manage.py generate_daily_puzzle --dry-run
```

---

## Gemini prompt

See `backend/quizzes/integrations/gemini.py:build_prompt`. Key rules
hard-coded into the prompt:

1. Never include the title or unique character names.
2. 6 rungs: rung 1 abstract, rung 6 close paraphrase.
3. Original prose, never quote TMDb verbatim.
4. 2–8 acceptable answer aliases including the canonical title.
5. Single JSON object response, no markdown fences.

---

## Validation

The output goes through three gates before it can hit the database:

1. **JSON parse** (with code-fence stripping for `gemini-1.5-flash`'s
   occasional habit of wrapping output).
2. **Schema validation** (Draft 2020-12 in `gemini.py:PUZZLE_SCHEMA`):
   - exactly 6 rungs, 24–280 chars each;
   - 2–8 aliases, 1–120 chars each;
   - no extra keys.
3. **Leak check**: refuse if the canonical title appears verbatim in
   any rung. Forces regeneration.

If any gate fails, the management command exits non-zero and the
GitHub Actions workflow auto-files a tagged issue.

---

## Failure modes and how they recover

| Failure | Symptom | Auto-recovery | Manual fix |
|---|---|---|---|
| Gemini quota / 5xx | 429 / 5xx | 3 retries + circuit breaker; hot-spare run at 23:00 UTC | Wait, or POST to `/admin/seed/` |
| TMDb 5xx | 502/503/504 | 3 retries; OMDb takes over; Wikidata as final tier | Re-run workflow |
| Bad JSON / schema | Generation fails | Issue filed; hot-spare run still has a day | Re-run workflow |
| Title leaks into rung | Generation fails | Issue filed | Re-run workflow |
| All eligible titles used | "No eligible titles" | None | Run `import_titles --pages 25` |
| Race (puzzle already exists) | "Daily puzzle already exists for X" | Skip (idempotent) | None needed |
| All three sources down | `CommandError: All overview sources failed` | None | POST to `/admin/seed/` with a hand-built ladder |

---

## Cost on free tier

- Gemini 1.5 Flash: 1 generation per day = ~30 / month. Free quota
  is 1,500/day, so we use less than 0.07 % of it.
- TMDb: 2 calls per generation (overview + alt titles). Quota is
  generous and unenforced for low-volume.
- Fly.io: SSH console call wakes the auto-stopped machine for 30
  seconds, then it idles back down.
- GitHub Actions: ~30 seconds of compute per day.

Total runtime cost: **$0**.

---

## Extending to multi-mode (Phase 5)

To add a new mode (e.g. cast ladder), this pipeline only needs:

1. A new Gemini prompt builder + schema in `gemini.py`.
2. A new branch in `generate_daily_puzzle._persist` that writes a
   `Quiz` with the new `mode` value.
3. A new entry in the GitHub Actions matrix:

   ```yaml
   strategy:
     matrix:
       mode: [synopsis_ladder, cast_ladder, quote, emoji_rebus]
   ```

4. The frontend `QuizQuestion` already renders all `question_type`
   slots, so no client-side changes are needed for purely text-based
   modes.

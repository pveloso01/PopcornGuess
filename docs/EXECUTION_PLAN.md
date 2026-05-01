# PopcornGuess — Autonomous Execution Plan

This is the live runbook the agent is executing in this session. It compresses
the 9-week roadmap (`docs/PRODUCTION_ROADMAP.md`) into a sequence of batches
that can be delivered in a single autonomous run with incremental commits.

## Goal

Hand off a deployable codebase. The user's only remaining job is to:
1. Buy a domain.
2. Provision Fly.io + Vercel + Neon + Cloudflare accounts (free, no card).
3. Set the listed environment variables.
4. Run the listed commands.

No marketing-blocker code is missing. Everything that needs human secrets
(API keys, domain) is wired through env vars.

## Batches

### Batch A — Phase 0: Stabilize (commit-by-commit)
- A.1 Commit existing analytics/views.py indentation fix.
- A.2 py_compile sweep across `backend/**`. Fix any other rot.
- A.3 Fix streak freeze save() bug in `backend/analytics/models.py`.
- A.4 Fix wrong prefetch in `backend/quizzes/views.py:QuizResultsView`.
- A.5 Wire Navbar streak to useStreak(); kill hardcoded 0.
- A.6 Delete leftover `frontend/app/quiz/page.tsx` mock.
- A.7 Replace outdated frontend tests so suite passes.
- A.8 Commit auto-generated migrations (quizzes/0001, analytics/0001, users/0002).
- A.9 Update README local-dev steps.

### Batch B — Phase 1: MVP feature surface
- B.1 Add `mode` enum field to `Quiz` (default `synopsis_ladder`).
- B.2 Title autocomplete: model store + endpoint + component.
- B.3 ShareGrid component (Wordle emoji grid, copy-to-clipboard, native share).
- B.4 StreakDistribution histogram component on results page.
- B.5 Feature flags helper to hide non-MVP routes for the Phase-1 deploy.

### Batch C — Phase 4: Auth
- C.1 Wire `dj-rest-auth` URLs in `popcornguess/urls.py`.
- C.2 Replace `AuthContext` stub with real implementation (httpOnly cookie JWT, refresh-on-401).
- C.3 Wire login/register pages.
- C.4 `POST /api/v1/anonymous/migrate/` atomic transfer endpoint.
- C.5 Frontend hook auto-calls migrate on register success.

### Batch D — Phase 2: Production configs
- D.1 Split `settings.py` → `settings/base.py`, `dev.py`, `prod.py`. Fail-fast `SECRET_KEY` in prod.
- D.2 Security headers + DRF throttling.
- D.3 `/health/` endpoint.
- D.4 `fly.toml` + production `Dockerfile` adjustments.
- D.5 `vercel.json`, `.vercelignore`.
- D.6 Update `.env.example` with all required keys.

### Batch E — Phase 3: CI/CD + automation
- E.1 `.github/workflows/ci.yml`.
- E.2 `.github/workflows/deploy-backend.yml`.
- E.3 `.github/workflows/deploy-frontend.yml` (verifies; Vercel auto-deploys via Git).
- E.4 `.github/workflows/generate-puzzle.yml`.
- E.5 `.github/workflows/cleanup.yml`.
- E.6 `.github/workflows/backup-db.yml`.

### Batch F — Phase 3b: Content pipeline
- F.1 `backend/quizzes/integrations/tmdb.py` (free key, retry).
- F.2 `backend/quizzes/integrations/gemini.py` (free key, JSON schema validation).
- F.3 `manage.py generate_daily_puzzle`.
- F.4 `manage.py import_titles`.
- F.5 Service-token-protected `/api/v1/quizzes/admin/seed/` endpoint.

### Batch G — Phase 6: PWA
- G.1 `public/manifest.webmanifest` + placeholder icons.
- G.2 Service worker (custom, no dep): static cache + network-first API.
- G.3 Offline fallback page.

### Batch H — Phase 9: SEO
- H.1 Update `sitemap.ts`.
- H.2 `app/robots.ts`.
- H.3 Default OG/Twitter cards in `layout.tsx`; per-page overrides where needed.
- H.4 JSON-LD `VideoGame` on home; `BreadcrumbList` on inner pages.
- H.5 Dynamic OG image via `next/og` for results pages.

### Batch I — Phase 10: Hardening
- I.1 Sentry init (backend + frontend, gated by env DSN).
- I.2 Custom login throttle scope.
- I.3 CSP report-only headers.
- I.4 `/legal/dmca` page + footer link.

### Batch J — Phase 8: Engagement
- J.1 Streak distribution endpoint + UI.
- J.2 Streak-freeze auto-grant logic.
- J.3 Countdown-to-next-puzzle component on home.
- J.4 Per-mode win-rate display in `/stats`.

### Batch K — Documentation
- K.1 `docs/RUNBOOK.md`.
- K.2 `docs/DEPLOYMENT.md` (one-page free-tier provisioning).
- K.3 `docs/CONTENT_PIPELINE.md`.
- K.4 Update root `README.md` to reflect new state and link to deployment guide.
- K.5 `FINAL_HANDOFF.md` at repo root with deploy-in-30-min checklist.

### Batch L — Final
- L.1 Full local test pass.
- L.2 Clean docker rebuild + manual smoke test.
- L.3 Push to develop.
- L.4 Tag release candidate.

## Commit Strategy

Each batch produces 1-N commits with conventional messages. Commits never
break `main` (we work on `develop`). The repository is left in a "ready to
merge develop → main when domain is bought" state.

## Out of Scope for This Run

These cannot be completed without domain + production secrets:
- 90 days of pre-generated content (the pipeline is built; the user runs the
  generator with a Gemini key after deploy).
- 7-day soak test.
- Real Sentry/UptimeRobot DSNs (env-gated, no-op without them).
- Lighthouse CI on real production URL (workflow drafted to run against deploy).

These are documented in `FINAL_HANDOFF.md` as the user's launch checklist.

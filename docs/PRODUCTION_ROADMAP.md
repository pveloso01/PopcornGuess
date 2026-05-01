# PopcornGuess — Zero-Cost Production Roadmap

> Supersedes `docs/IMPLEMENTATION_PLAN.md` for execution sequencing.
> Optimized for: production-grade quality, zero ongoing cost (domain only),
> full automation, marketing-ready by end-state.

---

## North Star

A multi-mode daily movie/TV puzzle hub, anonymous-first, friend-leagues built in,
content auto-generated daily by AI, deployed on free tiers, monitored, accessible,
PWA-installable. The only recurring expense is a domain (~$12/year).

The path is **walk-before-run**: ship a Wordle-for-movies MVP first (one mode,
text-only clues, no images/audio to dodge IP risk), reach the public on free
infrastructure, then layer modes and social mechanics until we hit
competitive-parity-plus-differentiation.

---

## Free-Tier Infrastructure Stack

| Concern | Provider | Free tier limit | Notes |
|---|---|---|---|
| Frontend hosting | Vercel Hobby | 100 GB bandwidth, unlimited static | Next.js native |
| Backend hosting | Fly.io | 3 shared-cpu-1x VMs (256 MB), 3 GB volumes | Django works; needs Dockerfile (we have it) |
| Postgres | Neon | 0.5 GB storage, 1 project, autosuspend | Branching for staging |
| Redis (optional) | Upstash | 10 K commands/day | Cache leaderboards; defer until needed |
| Object storage | Cloudflare R2 | 10 GB, free egress | Only if we add user uploads later |
| CDN / DNS / SSL | Cloudflare | Unlimited, free | Wraps Vercel + Fly |
| Movie data | TMDb API | Free with key (commercial OK with attribution) | CC-BY metadata |
| AI clue generation | Google AI Studio (Gemini 1.5 Flash) | 1,500 req/day, 1M tokens/min | Free tier no credit card |
| Cron / scheduled jobs | GitHub Actions | Unlimited on public repo, 2 K min/mo private | Daily content pipeline |
| Email | Resend | 3 K emails/mo, 100/day | Verification + streak reminders |
| Error tracking | Sentry Developer | 5 K events/mo | Frontend + backend |
| Uptime | UptimeRobot | 50 monitors @ 5-min interval | Public status optional |
| Analytics | Plausible self-hosted on Fly OR GA4 | Free | Privacy-first option |
| Auth | Django allauth + dj-rest-auth + SimpleJWT | Self-hosted | Already installed |
| Domain | Namecheap / Porkbun | $9-15/yr | The only recurring cost |

**Zero credit card required** to provision Fly.io, Vercel, Neon, Cloudflare,
Sentry, Resend, Google AI Studio, GitHub Actions, UptimeRobot.

---

## Phase 0 — Stabilize Develop Branch (1-2 days)

Goal: clean baseline before any new work.

- [ ] Commit the local fix to `backend/analytics/views.py` (indentation rot already corrected).
- [ ] `python -m py_compile` sweep across all `backend/**/*.py`; fix any other AI-generated indentation rot.
- [ ] Fix `backend/analytics/models.py:359` — `_use_streak_freeze` must `self.save(update_fields=["streak_freezes_available"])`.
- [ ] Drop or correct the wrong prefetch in `backend/quizzes/views.py:438`.
- [ ] Commit auto-generated migrations: `quizzes/0001_initial`, `analytics/0001_initial`, `users/0002_user_friends`.
- [ ] Replace outdated `frontend/app/page.test.tsx` and `frontend/app/layout.test.tsx` so the suite passes.
- [ ] Delete or redirect `frontend/app/quiz/page.tsx` (leftover mock duplicating `/quiz/daily`).
- [ ] Wire `Navbar` streak to `useStreak()` (no more hardcoded `0`).
- [ ] Update `README.md` with the actual local-dev steps that worked: `cp .env.example .env && docker compose up -d --build && docker compose exec backend python manage.py migrate && docker compose exec backend python manage.py seed_quizzes`.
- [ ] Open and merge a "stabilize-develop" PR.

**Exit criteria:** `docker compose up` produces a fully-playable site; `pytest` and `npm test` both pass.

---

## Phase 1 — Wordle-for-Movies MVP (1 week)

Goal: ship the simplest credible product. Pre-launch, but production-shaped.

**Scope cut:** hide `/modes`, `/quiz/blitz`, `/quiz/practice`, `/leaderboard`, `/profile`, `/friends` behind a `NEXT_PUBLIC_FEATURE_FLAGS` env var. Public surface is just:
- `/` (landing)
- `/quiz/daily` (today's puzzle)
- `/quiz/results/[id]` (with share grid)
- `/help`, `/privacy`, `/terms`

**Single mode — "Synopsis Ladder"** (text-only, zero IP risk):
- Each puzzle is one film/show.
- 6 clue rungs, increasing specificity: line 1 = abstract themed sentence; line 6 = first line of TMDb synopsis.
- Player has 6 attempts. After each wrong guess, next rung reveals.
- Title autocomplete from a curated list (top ~5K movies/shows by TMDb popularity).

**Why this mode first:**
- No copyrighted images, clips, or audio.
- TMDb metadata is CC-BY; AI-paraphrased synopses are original prose.
- Renders cleanly on mobile, dark theme, accessible.
- Same `Question.question_type="text"` slot already exists.

**Tasks:**
- [ ] Add `puzzle_kind` field to `Quiz` (default `synopsis_ladder`).
- [ ] Generate a "synopsis ladder" via Gemini for each seeded title.
- [ ] Title autocomplete endpoint: `GET /api/v1/quizzes/titles/?q=...` returning `[{id, title, year}]`.
- [ ] Frontend: `TitleAutocomplete` component (combobox with arrow-key nav, screen-reader announcements).
- [ ] Render rung-by-rung reveal in `QuizQuestion`.
- [ ] Wordle-style emoji share grid generator: 🟩 (correct), 🟨 (close — within 1 year + same genre), ⬛ (wrong). Copy-to-clipboard + `navigator.share`.
- [ ] Streak distribution histogram on results page.
- [ ] Add 90 days of pre-generated content for launch.

**Exit criteria:** complete a daily puzzle on mobile in under 60 seconds, share the grid to Twitter, return tomorrow and the streak ticks up.

---

## Phase 2 — Free-Tier Production Deployment (3 days)

Goal: live on the internet, free, with a real domain.

- [ ] Buy the domain (only spend in this entire roadmap).
- [ ] Cloudflare: create zone, point nameservers, enable proxy + auto-HTTPS.
- [ ] Neon: create production project + branch for staging.
- [ ] Fly.io: `fly launch` from `backend/`, set env (`DATABASE_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `GEMINI_API_KEY`, `TMDB_API_KEY`, `RESEND_API_KEY`).
- [ ] Vercel: link `frontend/`, set `NEXT_PUBLIC_API_URL=https://api.popcornguess.tld/api/v1`.
- [ ] Replace dev `SECRET_KEY` fallback with `os.environ["SECRET_KEY"]` (fail-fast).
- [ ] Production-only settings hardening: `SECURE_SSL_REDIRECT=True`, `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`, `SECURE_HSTS_SECONDS=31536000`, full CSP nonce-based.
- [ ] DRF throttling: `AnonRateThrottle: 60/min`, `UserRateThrottle: 240/min`, dedicated `submit/min` scope.
- [ ] `/health/` endpoint, hit by UptimeRobot every 5 min.
- [ ] Vercel domain alias + Fly cert + Cloudflare CNAME.

**Exit criteria:** `https://popcornguess.tld` serves the Phase-1 MVP over HTTPS with A+ on SSL Labs and Lighthouse perf > 80 on mobile.

---

## Phase 3 — Automation: CI/CD + Daily Content Pipeline (1 week)

Goal: zero human ops to keep the site fresh.

### CI/CD (GitHub Actions)

- [ ] `.github/workflows/ci.yml`: on PR, run `npm test`, `npm run lint`, `tsc --noEmit`, `pytest --cov`, `ruff check`, `bandit`.
- [ ] `.github/workflows/deploy-backend.yml`: on push to `main`, `flyctl deploy --remote-only`.
- [ ] `.github/workflows/deploy-frontend.yml`: Vercel auto-deploys on push.
- [ ] Branch protection on `main` requiring CI green.

### Daily content pipeline

- [ ] `.github/workflows/generate-puzzle.yml` — cron at `00:30 UTC` daily.
  1. Pick a candidate title from a curated TMDb pool (top-rated, weighted by recency, deduplicated against last 365 days).
  2. Pull synopsis + metadata from TMDb.
  3. Call Gemini Flash with a structured prompt to produce a 6-rung clue ladder + 5 answer aliases (e.g., "The Lord of the Rings" / "LOTR" / "Fellowship").
  4. Validate JSON schema; reject if any rung is too short, contains the title verbatim, or fails a banned-word filter.
  5. POST to `/api/v1/quizzes/admin/seed/` with a service-token; creates the `Quiz` + `Question` for `today + 1`.
  6. On failure, auto-create a GitHub issue with the prompt and Gemini response so a fallback can be hand-fixed within 24 h.

- [ ] `.github/workflows/cleanup.yml` — weekly: call management command to purge anonymous users inactive > 90 days.

- [ ] `.github/workflows/backup-db.yml` — nightly: dump Neon to a GitHub Release as an encrypted artifact (sops + age).

**Exit criteria:** for 14 consecutive days the site has a fresh puzzle each morning with zero manual intervention, and a synthetic failure (revoked Gemini key) auto-files an issue.

---

## Phase 4 — Identity & Friend Leagues (1.5 weeks)

Goal: ship the unfilled competitive gap (no other movie-dle has friend leagues).

### Auth

- [ ] Wire `dj-rest-auth` URLs in `backend/popcornguess/urls.py`: `/auth/login/`, `/auth/logout/`, `/auth/register/`, `/auth/token/refresh/`, `/auth/password/reset/`.
- [ ] JWT in **httpOnly secure SameSite=Lax cookie** (not localStorage).
- [ ] `frontend/contexts/AuthContext.tsx`: real `login/logout/register` hitting backend, auto-refresh on 401, expose `user` and `isAuthenticated`.
- [ ] Wire `frontend/app/auth/login/page.tsx` and `register/page.tsx` to AuthContext.
- [ ] Email verification via Resend (single-use token, 24 h expiry). Optional for MVP — gate "create league" behind verified email.

### Anonymous → Authenticated migration

- [ ] `POST /api/v1/anonymous/migrate/` — body: `{device_id}`, auth required. Transfers `Streak`, `UserStats`, `UserProgress`, all stats to the new authenticated user atomically. Idempotent.
- [ ] On register success, frontend posts current `device_id` and toasts "Your streak followed you in".

### Friends + Leagues

- [ ] `Friendship` model: `(from_user, to_user, status: pending|accepted|blocked)`.
- [ ] `League` model: `(owner, name, slug, invite_code, created_at)`. Members via M2M.
- [ ] Endpoints:
  - `POST /api/v1/friends/requests/` — send.
  - `POST /api/v1/friends/requests/{id}/accept|reject/`.
  - `GET /api/v1/leagues/` — my leagues.
  - `POST /api/v1/leagues/` — create (auth + verified email).
  - `POST /api/v1/leagues/join/` — body: `{invite_code}`.
  - `GET /api/v1/leagues/{slug}/leaderboard/?period=daily|weekly|all_time`.
- [ ] `/friends`, `/leagues`, `/leagues/[slug]` pages.

**Exit criteria:** two users can register, befriend, create a league, both play today's puzzle, see their league leaderboard ranked correctly.

---

## Phase 5 — Multi-Mode Hub (1.5 weeks)

Goal: parity with Moviedle/LoLdle portfolio strategy. Add modes one at a time;
each mode reuses `Question.question_type` and the existing `QuizQuestion` renderer.

| Mode | Slot | IP risk | Source |
|---|---|---|---|
| Synopsis Ladder (Phase 1) | `text` | None | TMDb + Gemini |
| Cast Ladder | `text` | None | TMDb credits |
| Quote of the Day | `quote` | Low (short quote = fair use) | Curated + manual review |
| Emoji Rebus | `emoji` | None | Gemini + human curator review queue |
| Year-Genre-BoxOffice Trio | `text` | None | TMDb + The Numbers (free scrape) |
| Decade-and-Director | `text` | None | TMDb |

- [ ] Add a `mode` slug to each `Quiz` so `/quiz/<mode>/daily` resolves.
- [ ] Re-enable `/modes` page as a real hub showing today's puzzle for each mode.
- [ ] Per-mode streak tracking (separate `Streak` rows keyed by `(user, mode)` — already supported by the schema with a small change).
- [ ] Per-mode share grid color scheme (Wordle uses one; we keep one per mode for memorable visual identity).
- [ ] Daily content pipeline extended: GitHub Actions matrix runs once per mode per day.

**Skipped intentionally:** image/poster/clip/audio modes — IP risk + storage cost. Revisit only if a takedown-tolerant CDN budget appears.

**Exit criteria:** 5 modes live, each playing daily, each with its own streak.

---

## Phase 6 — PWA + Performance (3 days)

Goal: <2s LCP, installable, offline shell.

- [ ] `frontend/public/manifest.webmanifest` with full icon set (192, 512, maskable).
- [ ] Service worker via `next-pwa` or hand-rolled — cache static assets, network-first for API, offline page for the daily puzzle if already loaded today.
- [ ] Image optimization: Next `<Image>` everywhere, AVIF/WebP, explicit width/height.
- [ ] Font: subset and self-host one display + one body face, preload the critical weight only.
- [ ] Code-split the leaderboard, profile, and league pages.
- [ ] Cloudflare cache rules: edge-cache `/_next/static/*` for 1 year; bypass for `/api/*`.
- [ ] Run Lighthouse on CI, fail under perf 90 / a11y 90 / best-practices 90 / SEO 95 / PWA 90.

**Exit criteria:** Mobile Lighthouse all four 90+. Site installs to phone home screen and the daily puzzle works offline after first visit.

---

## Phase 7 — Accessibility (3 days)

Goal: WCAG 2.2 AA. Beat the niche on a11y — every competitor we audited fails this.

- [ ] Semantic HTML pass: `<main>`, `<nav aria-label>`, `<section aria-labelledby>` everywhere.
- [ ] Forms: `aria-invalid`, `aria-describedby` for inline errors, visible focus rings.
- [ ] Title autocomplete: full WAI-ARIA combobox spec.
- [ ] Reduced-motion: respect `prefers-reduced-motion` on confetti, shake, fade-in animations.
- [ ] Colorblind-safe share grid: optional palette toggle (deuteranopia / protanopia / monochrome).
- [ ] Keyboard-only flow: tab through the entire daily puzzle, submit, share, all reachable.
- [ ] axe-core in CI, fail on critical violations.
- [ ] Manual screen-reader pass with NVDA on Windows, VoiceOver on iOS.

**Exit criteria:** axe-core 0 criticals; keyboard-only and screen-reader walkthroughs both succeed.

---

## Phase 8 — Engagement Mechanics (1 week)

Goal: Wordle-tier retention.

- [ ] Streak distribution histogram on `/quiz/results` (with personal performance bar highlighted).
- [ ] Streak freezes — auto-grant 1 freeze every 7 perfect days, max 3 banked. Already in the model; just fix the persistence bug + UI.
- [ ] Streak milestone celebration modal at 7 / 30 / 100 / 365 days (already partially built).
- [ ] Daily streak email reminder via Resend free tier — opt-in only, sent at the user's local 9 PM via per-user timezone.
- [ ] Per-mode win-rate stats on `/stats`.
- [ ] League weekly winner badge.
- [ ] On-app daily countdown to next puzzle.

**Exit criteria:** new user retention D1 > 35%, D7 > 15% (cohort tracked via Plausible).

---

## Phase 9 — SEO & Discoverability (3 days)

Goal: ready for organic and shared-link traffic.

- [ ] `app/sitemap.ts` already exists — extend to include `/archive/[date]` once archive ships.
- [ ] `app/robots.ts` allowing all, pointing to sitemap.
- [ ] Open Graph + Twitter Card per page; share grid result page renders a dynamic OG image (Vercel `next/og` is free).
- [ ] JSON-LD: `VideoGame` schema on home; `BreadcrumbList` on inner pages.
- [ ] Canonical URLs.
- [ ] `/archive` page once we have ≥30 days of content (gated for authed users to encourage sign-up).
- [ ] Per-mode landing pages targeting `"movie wordle"`, `"daily movie quiz"`, `"guess the show"` long-tails.

**Exit criteria:** Google Search Console verified, sitemap submitted, structured data validates, share-link previews look correct on iMessage / Twitter / Discord / WhatsApp.

---

## Phase 10 — Hardening & Observability (3 days)

Goal: free production safety net.

- [ ] Sentry SDK on backend (`sentry-sdk[django]`) and frontend (`@sentry/nextjs`); release tag = git SHA.
- [ ] UptimeRobot: 5-min ping on `/health/` and on home; SMS or email on outage.
- [ ] DRF throttling already added in Phase 2 — extend with custom scope per mode.
- [ ] Brute-force protection on login (django-axes or in-house lockout after 10 failures / 15 min).
- [ ] CSP report-only → enforce after a week of clean logs.
- [ ] Backup verification job: monthly, restore the latest dump to a Neon branch and run `manage.py check` against it.
- [ ] DMCA contact in footer + `/legal/dmca` page.
- [ ] GDPR-light: cookie banner only if Plausible + Resend require it (Plausible self-hosted does not).

**Exit criteria:** clean Sentry dashboard for 7 days, simulated outage triggers the alert, backup restore succeeds.

---

## Phase 11 — Verticals & Differentiation (Ongoing, opt-in)

Ship behind feature flags once the core is stable.

- **Anime mode:** TMDb genre + keyword filter; Crunchyroll/MAL-popular pool.
- **K-drama / J-drama mode:** TMDb origin-country filter.
- **Streamer filter:** TMDb watch-providers field — "Today's puzzle, Netflix-only".
- **Letterboxd import:** OAuth → ingest watched list → personalized "movies you've seen" mode (future, requires user opt-in).
- **TV-episode mode:** title-of-the-episode guessing inside a known series — open territory.

Each vertical reuses the same content-pipeline workflow with a different TMDb query and prompt template — no new code paths, just configuration.

---

## Phase 12 — Launch Readiness (3 days)

Final checklist before promoting publicly.

- [ ] 90 days of content seeded for every active mode.
- [ ] Privacy + Terms updated; Resend's data-processing addendum acknowledged.
- [ ] Lighthouse CI green for 7 consecutive deploys.
- [ ] Test coverage backend ≥ 80%, frontend ≥ 70%.
- [ ] Soak test: 7 days of synthetic traffic via GitHub Actions matrix hitting daily puzzle from 5 regions, error rate < 1%.
- [ ] Runbook (`docs/RUNBOOK.md`) covering: how to roll back, restore DB, rotate Gemini key, override a bad puzzle, handle DMCA.
- [ ] Feature flags audit — only public-ready features are on by default.
- [ ] Open-graph share-card screenshots for marketing.

**Exit criteria:** the only thing standing between PopcornGuess and traction is marketing.

---

## Sequencing & Dependencies

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
                                           ╲       ╲
                                            ╲       ▼
                                             ▼   Phase 8 (engagement)
                                          Phase 5 ──► Phase 6 ──► Phase 7
                                                         ╲           ╲
                                                          ▼           ▼
                                                       Phase 9 ──► Phase 10 ──► Phase 11 ──► Phase 12
```

Phases 4 and 5 can run in parallel by two contributors. Phase 8 depends only on Phase 4 (auth + leagues unlock email reminders).

Total elapsed time, single contributor: **~9 weeks** of focused work.

---

## Files That Don't Yet Exist (to be created)

- `backend/quizzes/management/commands/generate_daily_puzzle.py` — pulls TMDb + Gemini, inserts puzzle.
- `backend/quizzes/management/commands/import_titles.py` — refresh autocomplete pool from TMDb.
- `backend/quizzes/views.py:TitleAutocompleteView` — `GET /quizzes/titles/`.
- `backend/users/migrations/0003_email_verified.py` (after Phase 4).
- `backend/leagues/` (new app) with models, serializers, views, urls, tests.
- `backend/quizzes/integrations/tmdb.py`, `backend/quizzes/integrations/gemini.py` — thin wrappers with retry + schema validation.
- `frontend/components/TitleAutocomplete.tsx`.
- `frontend/components/ShareGrid.tsx` — emoji grid generator.
- `frontend/components/StreakDistribution.tsx`.
- `frontend/contexts/AuthContext.tsx` — replace stub.
- `frontend/hooks/useAuth.ts`, `useLeague.ts`.
- `frontend/public/manifest.webmanifest` and icon set.
- `.github/workflows/ci.yml`, `deploy-backend.yml`, `deploy-frontend.yml`, `generate-puzzle.yml`, `cleanup.yml`, `backup-db.yml`.
- `fly.toml` (backend), `vercel.json` (frontend if needed).
- `docs/RUNBOOK.md`.
- `docs/CONTENT_PIPELINE.md`.

## Files to Reuse, Not Rewrite

- `frontend/hooks/useAnonymousUser.ts` — extend for migration on auth.
- `frontend/hooks/useQuizSession.ts` — already covers full lifecycle.
- `frontend/lib/api.ts` — central client; add typed JWT interceptors here, don't fork.
- `frontend/components/QuizQuestion.tsx` — already multi-format.
- `backend/quizzes/views.py:SubmitAnswerView` — fuzzy match (85%) reused for every mode.
- `backend/analytics/models.py:Streak.update_streak()` — keep, fix the freeze bug.

---

## Cost Summary

| Item | Cost |
|---|---|
| Domain registration | $9-15/yr |
| Vercel | $0 |
| Fly.io | $0 (within free tier; ~95% headroom on a single 256 MB VM at expected MVP load) |
| Neon Postgres | $0 |
| Cloudflare | $0 |
| TMDb API | $0 |
| Gemini Flash | $0 |
| Resend | $0 |
| Sentry | $0 |
| UptimeRobot | $0 |
| GitHub Actions | $0 (public repo) |
| **Total ongoing** | **~$1/month amortized** |

## Risk Register

| Risk | Mitigation |
|---|---|
| Free tier limits exceeded under viral spike | Cloudflare caching + DRF throttling; if breached, Fly autoscales to paid only on user opt-in (we keep `auto_stop_machines=true`). |
| Gemini quota exhausted | Pre-generate 30+ days of buffer puzzles; monitor quota usage in CI. |
| TMDb rate-limit (40 req/10s) | Batched nightly pulls with exponential backoff; cache locally. |
| Single AI hallucinates a wrong answer | JSON-schema validation + 5-alias check; on-app "report puzzle" button creates a GitHub issue tagged `puzzle-error`. |
| Neon free tier 0.5 GB cap | Auto-prune `UserProgress` older than 6 months; archive to R2 if needed. |
| IP / DMCA on metadata | TMDb attribution in footer; only AI-original prose; takedown contact in footer. |
| Solo-maintainer bus factor | Full automation in Phase 3; runbook in Phase 12; everything reproducible from `git clone` + secrets. |

---

## Definition of "Done"

A new visitor lands on the domain on a phone, plays the daily puzzle, shares the
emoji grid to a friend, registers a free account that preserves their streak,
joins a friend's league, comes back tomorrow without any push from us — and
none of that costs us a dollar.

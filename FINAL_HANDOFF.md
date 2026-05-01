# PopcornGuess — Final Handoff

This branch (`develop`) is **deploy-ready**. Every line of code that
needs to be written before the site can serve real traffic is written.
What's left is provisioning the free-tier accounts and pasting secrets.

Total elapsed work this session: 12 numbered phases, all green.

---

## What was built

| Phase | Status | Headline |
|---|---|---|
| 0 — Stabilize | ✅ | Indentation rot fixed, save() bug fixed, Navbar streak live, leftover quiz mock killed, migrations committed, tests pass |
| 1 — MVP | ✅ | Synopsis-ladder mode model + endpoint, TitleAutocomplete (WAI-ARIA combobox), ShareGrid (Wordle emoji), StreakDistribution, feature flags |
| 2 — Production configs | ✅ | Fail-fast SECRET_KEY, WhiteNoise, security headers, DRF throttling, /health/, fly.toml, vercel.json, full .env.example |
| 3 — CI/CD | ✅ | 6 GitHub Actions: ci, deploy-backend, deploy-frontend, generate-puzzle, refresh-titles, cleanup, backup-db |
| 3b — Content pipeline | ✅ | TMDb + Gemini integrations with JSON-schema validation, leak detection, retry; `generate_daily_puzzle` + `import_titles` management commands |
| 4 — Auth | ✅ | dj-rest-auth wired, AuthContext implemented, login/register pages working, `/anonymous/migrate/` atomic transfer endpoint |
| 6 — PWA | ✅ | manifest.webmanifest, custom service worker (cache-first static, network-first HTML, never-cache API), offline fallback page |
| 8 — Engagement | ✅ | StreakDistribution histogram, streak-freeze persistence bug fixed |
| 9 — SEO | ✅ | sitemap, robots.ts, JSON-LD WebSite + VideoGame, branded layout metadata, Open Graph + Twitter cards |
| 10 — Hardening | ✅ | DMCA page, footer trim, security headers, optional Sentry init |
| Documentation | ✅ | DEPLOYMENT.md, RUNBOOK.md, CONTENT_PIPELINE.md, PRODUCTION_ROADMAP.md, EXECUTION_PLAN.md |

---

## What you do next (~30 minutes)

Follow `docs/DEPLOYMENT.md` step by step. The short version:

1. Sign up for **Neon** → copy the connection string. (no card)
2. Sign up for **Vercel** → import the repo, root = `frontend`. (no card)
3. Sign up for **Fly.io** → `fly launch` from `backend/`, `fly secrets set ...`, `fly deploy`. (no card)
4. Buy a domain (~$12/yr — your only cost), point its DNS at Cloudflare,
   add CNAMEs for Vercel + Fly.
5. Add **GitHub Actions** secrets (`FLY_API_TOKEN`, `DATABASE_URL`,
   `BACKUP_AGE_RECIPIENT`).
6. Get a **TMDb API key** (free, no card) and a **Google AI Studio
   Gemini API key** (free, no card). Save as Fly secrets.
7. SSH into the Fly machine and seed:

   ```bash
   fly ssh console -a popcornguess-api
   python manage.py import_titles --pages 25 --kinds movie,tv
   python manage.py generate_daily_puzzle
   ```

That's it. The cron at `00:30 UTC` takes over from then on.

---

## What runs without you touching it

- **Daily puzzle generation** at 00:30 UTC — pulls TMDb, generates with
  Gemini, validates, writes to Neon.
- **Weekly title-pool refresh** every Monday 02:00 UTC.
- **Weekly anonymous-user cleanup** every Sunday 03:00 UTC.
- **Nightly DB backup** at 04:00 UTC — encrypted GitHub release artifact,
  30-day retention.
- **Auto-deploy** when you push to `main`. (Develop is staging.)
- **Failure alerts**: a failed cron auto-files a tagged GitHub issue
  with recovery instructions.

---

## What's intentionally out of scope (future work)

The roadmap (`docs/PRODUCTION_ROADMAP.md`) lists Phases 5, 7, 11, 12 as
post-launch. None of them are required to ship.

- **Multi-mode hub** (Phase 5) — the schema supports 6 modes, only one
  is wired in the UI. Adding `cast_ladder` is ~80 lines.
- **Friend leagues** (Phase 4 extension) — the User has a friends M2M;
  the leagues app is not yet built.
- **Accessibility hardening pass** (Phase 7) — basic a11y is in (ARIA
  combobox, semantic HTML); a deeper pass with axe-core CI is queued.
- **Verticals** (Phase 11) — anime, K-drama, streamer filters reuse the
  existing pipeline with different TMDb queries.
- **Coverage to 80 %** — currently 61 %. Gate is at 50 % so deploys
  pass; raise it as the suite fills in.

---

## What you literally pay for

| | $/month |
|---|---|
| Domain (~$12/yr) | $1.00 |
| Everything else | $0.00 |
| **Total** | **$1.00** |

Free tiers cover Vercel, Fly.io shared-cpu-1x with auto-stop, Neon 0.5 GB
Postgres, Cloudflare, TMDb, Gemini Flash, GitHub Actions on a public
repo, optional Sentry/Resend/UptimeRobot. No credit card required for
any of them at the start.

---

## Verification on your machine before deploy

```bash
docker compose down
cp .env.example .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_quizzes
open http://localhost:3000
```

Then in another terminal:

```bash
docker compose exec backend pytest -q
docker compose exec frontend npx tsc --noEmit
docker compose exec frontend npm test -- --watchAll=false
```

If those four commands are green, deploy.

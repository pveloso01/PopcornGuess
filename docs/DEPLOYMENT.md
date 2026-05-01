# PopcornGuess — Free-Tier Deployment Guide

Take a clean repo to a live production site. Total recurring spend: **the
domain (~$12/year)**.

Estimated wall-clock time: **~30 minutes** of clicks plus DNS propagation.

---

## 0. Prerequisites

- A GitHub account with this repo pushed. The free Actions quota is
  unlimited on **public** repos and 2,000 minutes/month on **private**
  repos. Default to public.
- A custom domain (Namecheap, Porkbun, Cloudflare Registrar — pick the
  cheapest). Don't buy yet; you'll do it in step 4.
- A modern browser. No CLI is strictly required, but the Fly CLI shaves
  10 minutes off step 3.

---

## 1. Database — Neon (free)

1. Sign up at <https://neon.tech>. No credit card.
2. Create a project: `popcornguess`.
3. In the project dashboard, copy the **connection string**
   (starts with `postgres://...neon.tech/popcornguess?sslmode=require`).
4. Save it somewhere — you'll paste it as `DATABASE_URL` in step 3.

Free-tier limits: 0.5 GB storage, autosuspend after inactivity, plenty
for the first ~50K users of a daily puzzle.

---

## 2. Frontend — Vercel (free)

1. Sign up / log in at <https://vercel.com>.
2. **Import Git Repository** → pick this repo.
3. Configure project:
   - **Framework**: Next.js (auto-detected).
   - **Root directory**: `frontend`.
4. **Environment Variables** (add as `Production`):
   - `NEXT_PUBLIC_API_URL` = `https://YOUR-FLY-APP.fly.dev/api/v1`
     (we'll fix the value in step 3 after Fly is up; placeholder is fine for now).
   - `NEXT_PUBLIC_SITE_URL` = `https://popcornguess.com` (your domain).
   - `NEXT_PUBLIC_FEATURE_FLAGS` = `` (empty for Phase-1 launch).
5. Click **Deploy**. First build takes ~3 minutes.
6. Vercel gives you a `*.vercel.app` URL. Bookmark it.

You'll come back in step 5 to add the custom domain.

---

## 3. Backend — Fly.io (free)

1. Install the CLI: <https://fly.io/docs/flyctl/install/>.
2. `fly auth signup` — no credit card needed for the free shared-cpu-1x
   tier.
3. From the repo root:

   ```bash
   cd backend
   fly launch --no-deploy --copy-config
   ```

   Accept the existing `fly.toml`. Pick a region close to your users
   (e.g. `iad`). Give the app a unique name like `popcornguess-api`.

4. Set secrets:

   ```bash
   fly secrets set \
     SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')" \
     DATABASE_URL="<paste from step 1>" \
     ALLOWED_HOSTS="popcornguess-api.fly.dev,api.popcornguess.com" \
     CORS_ALLOWED_ORIGINS="https://popcornguess.com,https://www.popcornguess.com,https://YOUR-VERCEL-URL.vercel.app" \
     TMDB_API_KEY="<get from https://www.themoviedb.org/settings/api>" \
     GEMINI_API_KEY="<get from https://aistudio.google.com/apikey>" \
     PUZZLE_SEED_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')" \
     DEPLOY_ENV="production"
   ```

5. Deploy:

   ```bash
   fly deploy
   ```

6. Hit the health endpoint:

   ```bash
   curl https://popcornguess-api.fly.dev/health/
   # {"status": "ok", "db": true}
   ```

7. Update Vercel: set `NEXT_PUBLIC_API_URL` to
   `https://popcornguess-api.fly.dev/api/v1` and redeploy.

---

## 4. Domain — your registrar + Cloudflare DNS

1. Buy `popcornguess.com` (or whatever you like).
2. Add the domain to Cloudflare (free plan): <https://dash.cloudflare.com>.
3. Update nameservers at the registrar to Cloudflare's pair.
4. In Cloudflare DNS:
   - `popcornguess.com` → `CNAME` → `cname.vercel-dns.com` (proxied OFF).
   - `www.popcornguess.com` → `CNAME` → `cname.vercel-dns.com` (proxied OFF).
   - `api.popcornguess.com` → `CNAME` → `popcornguess-api.fly.dev` (proxied OFF).
5. In Vercel project → **Domains** → add `popcornguess.com` and
   `www.popcornguess.com`. Vercel issues SSL automatically.
6. In Fly: `fly certs create api.popcornguess.com`. Wait for the cert
   (a minute or two).
7. Update Vercel `NEXT_PUBLIC_API_URL` to `https://api.popcornguess.com/api/v1`
   and Fly `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` to match. Redeploy both.

---

## 5. GitHub Actions secrets + variables

Repository → Settings → Secrets and variables → Actions.

**Secrets:**

| Name | Source |
|---|---|
| `FLY_API_TOKEN` | `fly auth token` |
| `DATABASE_URL` | Neon connection string |
| `BACKUP_AGE_RECIPIENT` | Your age public key (`age-keygen` once locally) |
| `NEXT_PUBLIC_SENTRY_DSN` | (optional) Sentry browser DSN |

**Variables:**

| Name | Value |
|---|---|
| `FLY_APP_NAME` | `popcornguess-api` |
| `FLY_APP_HOST` | `popcornguess-api.fly.dev` |
| `NEXT_PUBLIC_API_URL` | `https://api.popcornguess.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://popcornguess.com` |
| `NEXT_PUBLIC_FEATURE_FLAGS` | empty for Phase-1 |

---

## 6. Seed initial content

```bash
fly ssh console -a popcornguess-api -C \
  "python manage.py import_titles --pages 25 --kinds movie,tv"
```

That gives you ~1,000 titles in the autocomplete pool.

Then prime tomorrow's puzzle:

```bash
fly ssh console -a popcornguess-api -C \
  "python manage.py generate_daily_puzzle"
```

From this point the GitHub Actions cron at `00:30 UTC` runs daily.

---

## 7. Optional integrations

Each is gated by an env var; everything works without them.

| Service | Free tier | Env var |
|---|---|---|
| **Sentry** | 5K errors/month | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |
| **Resend** | 3K emails/month | `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL` |
| **UptimeRobot** | 50 monitors @ 5 min | (just add an HTTP monitor on `/health/`) |
| **Plausible self-hosted** | Free if you self-host | (separate Fly app) |

---

## 8. Verification checklist

- [ ] `https://popcornguess.com` returns 200.
- [ ] `https://api.popcornguess.com/health/` returns `{"status":"ok"}`.
- [ ] `https://api.popcornguess.com/api/v1/quizzes/titles/?q=the` returns
      a non-empty list.
- [ ] Visit `/quiz/daily` and confirm a title autocompletes.
- [ ] Submit an answer; confirm the result page renders the share grid.
- [ ] Lighthouse mobile: Performance ≥ 90, PWA ≥ 90.
- [ ] `https://popcornguess.com/sitemap.xml` validates.
- [ ] `https://popcornguess.com/robots.txt` points to the sitemap.
- [ ] Submit the sitemap in Google Search Console.

You're done.

---

## Cost summary

| Item | Cost |
|---|---|
| Domain | $9–15 / year |
| Vercel | $0 |
| Fly.io | $0 (within shared-cpu-1x free tier) |
| Neon Postgres | $0 |
| Cloudflare DNS + SSL | $0 |
| TMDb API | $0 |
| Gemini Flash | $0 |
| GitHub Actions | $0 (public repo) |
| Sentry / UptimeRobot / Resend | $0 (within free tiers) |

The only number on your credit-card statement should be the domain.

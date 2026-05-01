# PopcornGuess — Runbook

Operational procedures for the only person on call: you.

Everything in this document is reproducible from `git clone` and the
secrets configured per `docs/DEPLOYMENT.md`.

---

## Daily content

### A puzzle didn't post overnight

Symptom: `/quiz/daily` shows "no puzzle available" or 404. GitHub
should have auto-filed an issue tagged `puzzle-error`.

Recovery (in order):

1. **Re-run the workflow.** Actions → "Generate daily puzzle" → Run
   workflow. Most failures are transient Gemini quota or TMDb 5xx.
2. **Hand-pick a title.** Find a TMDb ID
   (<https://www.themoviedb.org/movie/27205>; the URL ends in `/<id>`)
   and run:

   ```bash
   fly ssh console -a popcornguess-api -C \
     "python manage.py generate_daily_puzzle --tmdb-id 27205"
   ```

3. **Override the date** if the cron skipped a day:

   ```bash
   fly ssh console -a popcornguess-api -C \
     "python manage.py generate_daily_puzzle --date 2026-05-04 --tmdb-id 27205"
   ```

### A puzzle is wrong, offensive, or leaks the answer

Bad puzzles are atomic (one row in `DailyPuzzle`). Replace it:

```bash
fly ssh console -a popcornguess-api
# inside:
python manage.py shell -c "
from quizzes.models import DailyPuzzle
DailyPuzzle.objects.filter(date='2026-05-04').delete()
"
python manage.py generate_daily_puzzle --date 2026-05-04
```

### Quota exhausted

- **Gemini** quota resets daily at 00:00 PT.
- **TMDb** quota is generous; if hit, regenerate from a previously
  imported Title (`generate_daily_puzzle` doesn't call TMDb if
  `--tmdb-id` is supplied... wait, it does to fetch synopsis. If TMDb
  is hard-down, fall back to a manually-written question via Django admin).

---

## Database

### Restore from backup

Backups are nightly 04:00 UTC GitHub releases tagged `db-backup-<stamp>`,
encrypted with `age` to the operator's public key.

```bash
# 1. Download the asset
gh release download db-backup-20260501-0400 -p '*.dump.age'

# 2. Decrypt with your age private key
age -d -i ~/.age/popcornguess.key popcornguess-20260501-0400.dump.age \
  > popcornguess.dump

# 3. Restore to a fresh Neon branch first, never the prod branch
pg_restore -d "$STAGING_DATABASE_URL" --no-owner --no-acl popcornguess.dump

# 4. Smoke-test, then rename branches in Neon if you want to swap.
```

### Run a one-off migration / shell

```bash
fly ssh console -a popcornguess-api
python manage.py migrate
python manage.py shell
```

---

## Deploys

### Roll back

Every deploy creates a new Fly machine. Rollback is one command:

```bash
fly releases -a popcornguess-api          # find the last good version
fly releases rollback <version> -a popcornguess-api
```

Vercel rollback is one click in the Deployments tab.

### Force a redeploy without code changes

```bash
fly deploy -a popcornguess-api --force-machines
```

Vercel: Deployments → ⋯ → Redeploy.

---

## Secrets

### Rotate the Django SECRET_KEY

Rotating `SECRET_KEY` invalidates **all sessions and JWTs**. Plan for
that.

```bash
fly secrets set \
  SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')" \
  -a popcornguess-api
```

Fly auto-restarts the machine.

### Rotate the Gemini key

1. Generate a new key in Google AI Studio.
2. `fly secrets set GEMINI_API_KEY=<new> -a popcornguess-api`.
3. Revoke the old key.
4. Force a generate-puzzle run to confirm.

### Rotate the TMDb key

Same procedure — TMDb keys do not chain on requests, so swap and run
`fly secrets set TMDB_API_KEY=<new>`.

### A secret leaked into git

```bash
fly secrets set SECRET_KEY=$NEW_VALUE -a popcornguess-api
git filter-repo --path-glob '*.env' --invert-paths   # if needed
git push --force-with-lease
```

Then rotate every other secret as a precaution.

---

## Incidents

### Site is down

1. Check `/health/`. If 503, the database is the problem (Neon
   autosuspended or hit storage cap). Open Neon dashboard.
2. If `/health/` is fine but the home page is down, Vercel build
   failed — check Deployments tab.
3. If both are fine, check Cloudflare DNS / SSL status.

### Brute-force on login

DRF throttling caps at `THROTTLE_LOGIN` (default 10/min). If you see a
spike, lower it via `fly secrets set THROTTLE_LOGIN=3/min`.

### Sudden flood of anonymous accounts

Cleanup runs weekly; if Neon is filling up, run early:

```bash
fly ssh console -a popcornguess-api -C \
  "python manage.py cleanup_anonymous_users --days 30"
```

---

## DMCA takedown

Process is documented at `/legal/dmca`.

Mechanically:

```bash
fly ssh console -a popcornguess-api
python manage.py shell -c "
from quizzes.models import Quiz, DailyPuzzle
Quiz.objects.filter(title__iexact='<offending title>').update(is_published=False)
"
```

The puzzle vanishes from `/quiz/daily` immediately. Reply to the
notice within 7 business days.

---

## Smoke test before any release

```bash
# Backend
docker compose exec -T backend python -m compileall -q .
docker compose exec -T backend python manage.py migrate --check
docker compose exec -T backend pytest -q

# Frontend
docker compose exec -T frontend npx tsc --noEmit
docker compose exec -T frontend npm test -- --watchAll=false
docker compose exec -T frontend npm run build

# Live
curl -sf https://api.popcornguess.com/health/ | jq .
curl -sf https://popcornguess.com/sitemap.xml | head -c 200
curl -sf https://popcornguess.com/robots.txt | head
```

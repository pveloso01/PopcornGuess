FROM python:3.11-slim AS base

# Speed + reproducibility flags.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System dependencies. postgresql-client is needed at runtime for the
# nightly backup workflow (pg_dump) when run via `fly ssh console`.
RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python deps — copy lock files first so layer cache survives source edits.
COPY requirements.txt requirements-dev.txt ./
ARG INSTALL_DEV=0
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    if [ "$INSTALL_DEV" = "1" ]; then pip install -r requirements-dev.txt; fi

# Project code.
COPY . .

# Collect static for whitenoise. Skipped on local-dev (DEBUG=True) since
# `runserver` serves static itself, but keeping it here makes the same
# image work in both environments.
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Default command runs gunicorn (production). Local docker-compose
# overrides this to `python manage.py runserver` for hot reload.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn popcornguess.wsgi:application --bind 0.0.0.0:8000 --workers ${WEB_CONCURRENCY:-2} --timeout 60 --access-logfile - --error-logfile -"]

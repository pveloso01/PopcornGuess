# Docker Development Setup Guide

This document provides detailed information about the Docker development
environment for PopcornGuess.

## Overview

The Docker Compose setup includes three services:

- **PostgreSQL Database** (port 5433)
- **Django Backend** (port 8000)
- **Next.js Frontend** (port 3000)

## Quick Start

```bash
# Copy environment variables
cp .env.example .env

# Build and start all services
docker compose up

# Or run in detached mode (background)
docker compose up -d
```

## Configuration

### Environment Variables

The `.env` file contains all configuration for the Docker environment:

- **Database**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- **Django**: `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
- **Frontend**: `NODE_ENV`, `NEXT_PUBLIC_API_URL`

### Port Mappings

- PostgreSQL: `5433:5432` (5433 on host to avoid conflicts with local PostgreSQL)
- Backend: `8000:8000`
- Frontend: `3000:3000`

## Hot Reload

Both frontend and backend support hot reload:

- **Backend**: Django's `runserver` automatically detects file changes
- **Frontend**: Next.js dev server watches for changes with `WATCHPACK_POLLING`

## Common Commands

```bash
# Start services
docker compose up

# Start in background
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Rebuild after dependency changes
docker compose build
docker compose up --build

# Run Django migrations
docker compose exec backend python manage.py migrate

# Create Django superuser
docker compose exec backend python manage.py createsuperuser

# Run backend tests
docker compose exec backend pytest

# Run frontend tests
docker compose exec frontend npm test

# Access PostgreSQL
docker compose exec db psql -U postgres -d popcornguess
```

## Development Workflow

1. **Start services**: `docker compose up -d`
2. **Make changes**: Edit files in `backend/` or `frontend/`
3. **See changes**: Hot reload will update automatically
4. **View logs**: `docker compose logs -f`
5. **Stop services**: `docker compose down`

## Troubleshooting

### Port Already in Use

If you see "address already in use" errors:

```bash
# Check what's using the port
lsof -i :3000
lsof -i :8000
lsof -i :5433

# Stop the service or change the port in docker-compose.yml
```

### Database Connection Issues

```bash
# Check if database is healthy
docker compose ps

# View database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Container Not Starting

```bash
# View logs
docker compose logs

# Rebuild from scratch
docker compose down -v  # WARNING: This deletes volumes
docker compose build --no-cache
docker compose up
```

### Hot Reload Not Working

- Ensure volumes are mounted correctly in `docker-compose.yml`
- Check that `node_modules` and `venv` are excluded in volume mounts
- For frontend, `WATCHPACK_POLLING=true` enables polling mode

## File Structure

```text
.
├── docker-compose.yml          # Main compose configuration
├── .env.example                # Environment variable template
├── .env                        # Local environment variables (gitignored)
├── backend/
│   ├── Dockerfile              # Backend container definition
│   ├── .dockerignore           # Files to exclude from build
│   └── ...
└── frontend/
    ├── Dockerfile              # Frontend container definition
    ├── .dockerignore           # Files to exclude from build
    └── ...
```

## Benefits of Docker Setup

1. **Consistency**: Same environment for all developers
2. **Isolation**: No conflicts with local installations
3. **Easy Setup**: One command to start everything
4. **Hot Reload**: Fast development iteration
5. **Production-Like**: Similar to deployment environment

## Next Steps

After setting up Docker:

1. Run migrations: `docker compose exec backend python manage.py migrate`
2. Create a superuser: `docker compose exec backend python manage.py createsuperuser`
3. Access the API: <http://localhost:8000/admin>
4. Access the frontend: <http://localhost:3000>

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Django Docker Guide](https://docs.djangoproject.com/en/4.2/howto/deployment/docker/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)

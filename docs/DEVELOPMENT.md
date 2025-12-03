# Development Guide

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Docker (optional)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development

# Set up environment variables
# Copy .env.example from project root and configure

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### Docker Setup (Recommended)

```bash
# From project root
docker compose up
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- PostgreSQL: localhost:5433

## Running Tests

### Backend

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov

# Run specific tests
pytest users/tests.py -v
```

### Frontend

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Code Quality

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg
```

Hooks automatically run:
- Black (Python formatting)
- Flake8 (Python linting)
- isort (Import sorting)
- Prettier (JS/TS formatting)
- ESLint (JS/TS linting)

### Manual Checks

```bash
# Backend
cd backend
black .
flake8
mypy .
bandit -r .

# Frontend
cd frontend
npm run lint
npm run format
```

## Database Migrations

### Creating Migrations

```bash
python manage.py makemigrations
```

### Applying Migrations

```bash
python manage.py migrate
```

### Viewing Migration Status

```bash
python manage.py showmigrations
```

## Django Admin

Access at: http://localhost:8000/admin/

Create superuser:
```bash
python manage.py createsuperuser
```

## Environment Variables

Required variables (see `.env.example`):

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Project Structure

```
PopcornGuess/
├── backend/
│   ├── users/           # User management app
│   ├── quizzes/         # Quiz functionality
│   ├── analytics/       # Analytics tracking
│   ├── popcornguess/    # Django project settings
│   └── logs/            # Application logs
├── frontend/
│   └── app/             # Next.js app directory
├── docs/                # Project documentation
└── docker-compose.yml   # Docker configuration
```

## Common Issues

### Port Already in Use

```bash
# Find process using port 8000
lsof -ti:8000 | xargs kill -9
```

### Database Connection Error

- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify credentials

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## Best Practices

- Always work in a virtual environment
- Run tests before committing
- Keep migrations small and focused
- Write descriptive commit messages
- Follow conventional commits format
- Update tests when changing models/views

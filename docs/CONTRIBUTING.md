# Contributing to PopcornGuess

Thank you for your interest in contributing to PopcornGuess!

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Git

### Initial Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/PopcornGuess.git
   cd PopcornGuess
   ```

1. Install pre-commit hooks:

   ```bash
   pip install pre-commit
   pre-commit install
   ```

1. Backend setup:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

1. Frontend setup:

   ```bash
   cd frontend
   npm install
   ```

## Pre-commit Hooks

We use pre-commit hooks to ensure code quality. They will run automatically on `git commit`.

### What the hooks do

**General:**

- Remove trailing whitespace
- Fix end of file
- Check YAML, JSON, TOML syntax
- Detect large files, merge conflicts, private keys
- Fix mixed line endings

**Python (Backend):**

- **Black**: Auto-format code
- **Flake8**: Lint code
- **isort**: Sort imports
- **mypy**: Type checking
- **Bandit**: Security vulnerability scanning

**JavaScript/TypeScript (Frontend):**

- **Prettier**: Auto-format code
- **ESLint**: Lint and auto-fix issues

**Other:**

- **Commitizen**: Enforce conventional commit messages
- **markdownlint**: Lint Markdown files
- **detect-secrets**: Prevent committing secrets

### Run hooks manually

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files
pre-commit run eslint --all-files

# Skip hooks (not recommended)
git commit --no-verify
```

## Code Quality Standards

### Python

- **Formatting**: Black (88 character line length)
- **Imports**: isort with Black profile
- **Linting**: Flake8
- **Type hints**: Required for all functions
- **Docstrings**: Required for public APIs
- **Test coverage**: Minimum 80%

### JavaScript/TypeScript

- **Formatting**: Prettier
- **Linting**: ESLint with Next.js config
- **Type safety**: TypeScript strict mode
- **Test coverage**: Minimum 70%

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

**Examples:**

```bash
feat(quiz): add daily movie quiz feature
fix(auth): resolve login redirect issue
docs(readme): update installation instructions
test(quiz): add unit tests for quiz service
```

## Testing

### Backend

```bash
cd backend
source venv/bin/activate
pytest
pytest --cov=. --cov-report=html
```

### Frontend

```bash
cd frontend
npm test
npm run test:coverage
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Ensure all tests pass and coverage meets thresholds
4. Commit with conventional commit messages
5. Push and create a pull request
6. Wait for CI checks to pass
7. Request review from maintainers

## Questions?

Open an issue or reach out to the maintainers.

Happy coding! 🎬🍿

# GitHub Actions Workflows

## CI Workflow

The CI workflow runs on every pull request and push to main/develop branches:

- **Frontend**: Linting, type checking, tests, and build verification
- **Backend**: Linting, type checking, and tests with PostgreSQL service

## CD Workflow

The CD workflow deploys to staging environment on pushes to main branch.


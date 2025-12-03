# PopcornGuess Documentation

Welcome to the PopcornGuess documentation! This guide will help you navigate through our technical documentation.

## 📖 Reading Order

### For New Contributors

Follow this order to get started:

1. **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Start here! Setup your development environment
2. **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Docker environment details (optional but recommended)
3. **[USER_MODEL.md](./USER_MODEL.md)** - Understand the authentication system
4. **[API.md](./API.md)** - Learn about the API endpoints
5. **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and workflow

### For Project Planning

- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Complete project roadmap with milestones and tasks

## 📚 Documentation Index

### Getting Started

**[DEVELOPMENT.md](./DEVELOPMENT.md)**
- Prerequisites and installation
- Running tests
- Code quality tools
- Database migrations
- Common issues and solutions

**[DOCKER_SETUP.md](./DOCKER_SETUP.md)**
- Docker Compose setup
- Service configuration
- Development workflows with Docker
- Hot reload and debugging

### Architecture & Design

**[USER_MODEL.md](./USER_MODEL.md)**
- Custom user model rationale
- Email vs username (authentication vs display)
- Model structure and fields
- Usage examples

**[API.md](./API.md)**
- API versioning strategy
- Authentication methods
- Endpoint documentation
- Request/response examples
- Error handling

### Contributing

**[CONTRIBUTING.md](./CONTRIBUTING.md)**
- Development workflow
- Code quality standards
- Testing requirements
- Commit conventions
- Pull request process

### Planning

**[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)**
- Project milestones
- Feature epics
- Task breakdown
- Effort estimates
- Development priorities

## 🔍 Quick Reference

### Common Commands

\`\`\`bash
# Backend
cd backend
python manage.py runserver
python manage.py test
python manage.py migrate

# Frontend
cd frontend
npm run dev
npm test

# Docker
docker compose up
docker compose down
docker compose logs -f
\`\`\`

### Key Concepts

- **Authentication**: Email for login, username for display
- **API Versioning**: \`/api/v1/\` URL path versioning
- **Testing**: 80% backend, 70% frontend coverage requirements
- **Code Quality**: Automated formatting and linting via pre-commit hooks

## 💡 Tips

- Use Docker for the easiest setup experience
- Install pre-commit hooks immediately after cloning
- Run tests frequently during development
- Check the API documentation when building frontend features
- Refer to USER_MODEL.md when working with user-related features

## 🆘 Getting Help

1. Check the relevant documentation file first
2. Search existing GitHub issues
3. Ask in project discussions
4. Contact the development team

## 📝 Contributing to Documentation

Found something unclear or outdated? Please:

1. Open an issue describing the problem
2. Submit a PR with improvements
3. Keep documentation concise and focused
4. Include examples where helpful

---

**Ready to start?** Head to [DEVELOPMENT.md](./DEVELOPMENT.md) to set up your environment!

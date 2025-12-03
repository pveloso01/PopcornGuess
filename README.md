# PopcornGuess 🍿

A daily movie and TV trivia quiz platform inspired by Wordle, LoLdle, and Narutodle. Test your knowledge of films and television shows with a new challenge every day!

## 🎯 Project Overview

PopcornGuess is a web-based daily trivia game where players guess movies and TV shows based on various clues (quotes, images, emojis, etc.). The platform emphasizes:

- **Daily Challenges**: One new quiz every day to build habit-forming engagement
- **Anonymous Play**: Start playing immediately without sign-up
- **Streak Tracking**: Maintain daily streaks to keep coming back
- **Multiple Game Modes**: Daily quiz, fast blitz, casual practice, and competitive challenges
- **Social Sharing**: Share results without spoilers (Wordle-style)
- **Community Features**: Leaderboards, stats, and friend challenges

## 📋 Documentation

- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Comprehensive implementation plan with labels, milestones, epics, issues, and effort estimates
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Detailed Docker development environment guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and workflow

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Docker (optional, for containerized development)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/PopcornGuess.git
cd PopcornGuess


### Docker Setup (Recommended)

The easiest way to get started is using Docker Compose, which sets up all services (frontend, backend, and database) with hot reload enabled.

```bash
# Copy environment variables
cp .env.example .env

# Build and start all services
docker compose up

# Or run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after dependency changes
docker compose up --build
```

**Services:**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000>
- PostgreSQL: localhost:5433 (mapped to avoid conflicts with local PostgreSQL)

**Hot Reload:** Both frontend and backend support hot reload. Changes to your code will automatically trigger reloads without needing to rebuild containers.

### Manual Setup (Without Docker)

If you prefer to run services locally without Docker:

```bash
# Install pre-commit hooks (recommended for contributors)
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development

# Set up PostgreSQL database (ensure PostgreSQL is running)
# Update DATABASE_URL in .env or use default settings
python manage.py migrate
python manage.py runserver

# Frontend setup (in another terminal)
cd frontend
npm install
npm run dev
```

## 🏗️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Django 4.2+, Django REST Framework, PostgreSQL
- **Deployment**: TBD (Vercel/Netlify for frontend, Railway/Render for backend)

## 📅 Development Roadmap

### Milestone 1: MVP Foundation

- Project setup and infrastructure
- Core quiz gameplay
- Anonymous user system
- Social sharing
- Landing page and navigation

### Milestone 2: Game Modes & Content

- Additional game modes (Blitz, Practice, Competitive)
- Content management system
- Leaderboard system

### Milestone 3: User Accounts & Social Features

- User authentication
- User profiles
- Friend system and challenges

### Milestone 4: Launch Preparation

- Testing and QA
- Content preparation
- Analytics and monitoring
- Documentation and legal pages

### Milestone 5: Post-Launch Growth

- Performance optimization and scaling
- Feature enhancements (streak freeze, hints, archive)
- Community features and forums
- Notifications system

### Milestone 6: Monetization Phase 1

- Advertising integration
- Freemium foundation
- Premium account system
- Payment processing

### Milestone 7: Mobile App

- iOS and Android native apps
- Mobile-specific features
- Push notifications
- App store submissions

### Milestone 8: Monetization Phase 2

- Subscription model
- Sponsorships and partnerships
- In-app purchases
- Advanced monetization features

### Milestone 9: Advanced Features & Scaling

- Multiplayer and tournament modes
- Internationalization
- Advanced analytics and A/B testing
- Infrastructure scaling

### Milestone 10: Long-Term Sustainability

- Community growth programs
- Content expansion
- Platform expansion and APIs
- Partner integrations

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for complete roadmap.

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Install pre-commit hooks: `pip install pre-commit && pre-commit install`
3. Create a feature branch (`git checkout -b feat/amazing-feature`)
4. Make your changes (hooks will auto-format on commit)
5. Write tests and ensure coverage meets thresholds
6. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
7. Push to the branch (`git push origin feat/amazing-feature`)
8. Open a Pull Request

### Code Quality

We use automated tools to maintain code quality:

- **Python**: Black, Flake8, isort, mypy, Bandit
- **JavaScript/TypeScript**: Prettier, ESLint
- **Git**: Pre-commit hooks auto-format and lint on every commit
- **Testing**: 80% coverage for backend, 70% for frontend

## 🎨 Design Principles

- **Simplicity**: Clean, uncluttered interface
- **Accessibility**: Mobile-first, responsive design
- **Performance**: Fast load times and smooth interactions
- **Engagement**: Habit-forming through streaks and daily challenges
- **Community**: Social features that encourage sharing and competition

## 📊 Project Status

🚧 **In Development** - MVP Foundation phase

Current focus: Setting up project infrastructure and core gameplay mechanics.

## 📄 License

[License to be determined]

## 🙏 Acknowledgments

Inspired by:

- [Wordle](https://www.nytimes.com/games/wordle/index.html) - Daily word puzzle
- [LoLdle](https://loldle.net/) - League of Legends daily guessing game
- [Narutodle](https://mangadle.net/) - Naruto character guessing game

## 📧 Contact

**Devs:**

- Pedro Veloso, <pedrovelosofernandes@outlook.com>
- Rodrigo Figueiredo

---

**Note**: This project is in active development. Features and roadmap are subject to change based on user feedback and market conditions.

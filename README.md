# PopcornGuess 🍿

A daily movie and TV trivia quiz platform inspired by Wordle, LoLdle, and Narutodle. Test your knowledge of films and television shows with a new challenge every day!

## 🎯 About

PopcornGuess is a web-based daily trivia game where players guess movies and TV shows based on various clues (quotes, images, emojis, etc.). The platform emphasizes:

- **Daily Challenges**: One new quiz every day to build habit-forming engagement
- **Anonymous Play**: Start playing immediately without sign-up
- **Streak Tracking**: Maintain daily streaks to keep coming back
- **Multiple Game Modes**: Daily quiz, fast blitz, casual practice, and competitive challenges
- **Social Sharing**: Share results without spoilers (Wordle-style)
- **Community Features**: Leaderboards, stats, and friend challenges

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Copy environment variables
cp .env.example .env

# Start all services
docker compose up
```

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5433

### Manual Setup

See [Development Guide](./docs/DEVELOPMENT.md) for detailed setup instructions.

## 🏗️ Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **Backend**: Django 4.2+, Django REST Framework, PostgreSQL
- **Deployment**: TBD

## 📚 Documentation

- **[Development Guide](./docs/DEVELOPMENT.md)** - Setup and development workflows
- **[Contributing](./docs/CONTRIBUTING.md)** - How to contribute to the project
- **[API Reference](./docs/API.md)** - REST API endpoints
- **[User Model](./docs/USER_MODEL.md)** - Custom user model design
- **[Docker Setup](./docs/DOCKER_SETUP.md)** - Docker environment details
- **[Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)** - Project roadmap

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Read the [Contributing Guide](./docs/CONTRIBUTING.md)
2. Fork the repository
3. Create a feature branch
4. Make your changes
5. Submit a pull request

Quick setup for contributors:

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# See docs/DEVELOPMENT.md for complete setup
```

## 📊 Project Status

🚧 **In Development** - MVP Foundation phase

Current focus: Setting up project infrastructure and core gameplay mechanics.

## 🎨 Design Principles

- **Simplicity**: Clean, uncluttered interface
- **Accessibility**: Mobile-first, responsive design
- **Performance**: Fast load times and smooth interactions
- **Engagement**: Habit-forming through streaks and daily challenges

## 📄 License

[License to be determined]

## 🙏 Acknowledgments

Inspired by:
- [Wordle](https://www.nytimes.com/games/wordle/index.html)
- [LoLdle](https://loldle.net/)
- [Narutodle](https://mangadle.net/)

## 📧 Contact

**Developers:**
- Pedro Veloso - pedrovelosofernandes@outlook.com
- Rodrigo Figueiredo

---

**Note**: This project is in active development. Features and roadmap are subject to change.

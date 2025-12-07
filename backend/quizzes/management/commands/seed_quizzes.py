"""
Management command to seed database with quiz content.

Usage:
    python manage.py seed_quizzes
    python manage.py seed_quizzes --count 30
    python manage.py seed_quizzes --flush  # WARNING: Deletes all existing quizzes
"""

import logging
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from quizzes.models import Category, DailyPuzzle, Question, Quiz, QuizQuestion

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seeds the database with quiz content for testing and initial launch."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--count",
            type=int,
            default=30,
            help="Number of daily quizzes to create (default: 30)",
        )
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing quizzes before seeding (WARNING: destructive)",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        count = options["count"]
        flush = options["flush"]

        if flush:
            self.stdout.write(self.style.WARNING("Flushing all existing quiz data..."))
            Question.objects.all().delete()
            Quiz.objects.all().delete()
            DailyPuzzle.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Quiz data flushed."))

        self.stdout.write(
            self.style.SUCCESS(f"Starting quiz seeding with {count} quizzes...")
        )

        # Create categories if they don't exist
        categories = self._create_categories()

        # Create quizzes
        quizzes_created = 0
        for i in range(count):
            quiz = self._create_sample_quiz(i + 1, categories)
            if quiz:
                quizzes_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created {quizzes_created} quizzes with questions."
            )
        )

        # Schedule daily puzzles
        self._schedule_daily_puzzles(quizzes_created)

        self.stdout.write(self.style.SUCCESS("Quiz seeding completed! 🎬"))

    def _create_categories(self):  # type: ignore[no-untyped-def]
        """Create default categories."""
        categories_data = [
            {
                "name": "Movies",
                "slug": "movies",
                "description": "Classic and modern films",
                "icon": "🎬",
            },
            {
                "name": "TV Shows",
                "slug": "tv-shows",
                "description": "Television series and streaming shows",
                "icon": "📺",
            },
            {
                "name": "Actors",
                "slug": "actors",
                "description": "Famous actors and their roles",
                "icon": "🌟",
            },
            {
                "name": "Directors",
                "slug": "directors",
                "description": "Film and TV directors",
                "icon": "🎥",
            },
            {
                "name": "Quotes",
                "slug": "quotes",
                "description": "Memorable movie and TV quotes",
                "icon": "💬",
            },
        ]

        categories = {}
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=cat_data["slug"],
                defaults={
                    "name": cat_data["name"],
                    "description": cat_data["description"],
                    "icon": cat_data["icon"],
                },
            )
            categories[cat_data["slug"]] = category
            if created:
                self.stdout.write(
                    f"  Created category: {category.name} {category.icon}"
                )

        return categories

    def _create_sample_quiz(  # type: ignore[no-untyped-def]
        self, day_number, categories
    ):
        """Create a sample quiz with questions."""
        category = random.choice(list(categories.values()))  # nosec B311

        quiz = Quiz.objects.create(
            title=f"Daily PopcornGuess #{day_number}",
            slug=f"daily-quiz-{day_number}",
            description=f"Test your {category.name.lower()} knowledge!",
            quiz_type="daily",
            category=category,
            time_limit_seconds=None,  # No time limit for daily
            max_attempts=6,
            is_published=True,
            publish_date=timezone.now().date(),
        )

        # Create 10 questions for this quiz
        questions_data = self._get_sample_questions_data(category.slug, day_number)
        for order, question_data in enumerate(questions_data, start=1):
            question = Question.objects.create(**question_data)
            QuizQuestion.objects.create(quiz=quiz, question=question, order=order)

        return quiz

    def _get_sample_questions_data(  # type: ignore[no-untyped-def]
        self, category_slug, day_number
    ):
        """Get sample question data based on category."""
        # This is a simplified version - in a real app, you'd load from a JSON file
        # or database with thousands of questions

        if category_slug == "movies":
            return self._get_movie_questions(day_number)
        elif category_slug == "tv-shows":
            return self._get_tv_questions(day_number)
        elif category_slug == "actors":
            return self._get_actor_questions(day_number)
        elif category_slug == "directors":
            return self._get_director_questions(day_number)
        elif category_slug == "quotes":
            return self._get_quote_questions(day_number)
        else:
            return self._get_movie_questions(day_number)

    def _get_movie_questions(self, day_number):  # type: ignore[no-untyped-def]
        """Sample movie questions."""
        # This is a small sample - real implementation would have hundreds
        # fmt: off
        # flake8: noqa: E501
        all_questions = [
            {
                "question_type": "text",
                "text": "🎬 Which 1994 prison drama starred Tim Robbins and Morgan Freeman?",
                "correct_answer": "The Shawshank Redemption",
                "alternative_answers": [
                    "Shawshank Redemption",
                    "Shawshank",
                ],
                "hint_1": "It's set in a prison called Shawshank",
                "hint_2": "The movie involves a redemption theme",
                "hint_3": "Starts with 'The'",
                "difficulty": "medium",
                "explanation": "The Shawshank Redemption is consistently ranked as one of the greatest films of all time.",
            },
            {
                "question_type": "emoji",
                "text": "What movie is this?",
                "emoji_clues": "🦁👑",
                "correct_answer": "The Lion King",
                "alternative_answers": ["Lion King"],
                "hint_1": "It's a Disney animated film",
                "hint_2": "Features Simba as the main character",
                "hint_3": "Hakuna Matata!",
                "difficulty": "easy",
                "explanation": "The Lion King is a classic Disney animated film from 1994.",
            },
            {
                "question_type": "text",
                "text": "Which 1999 sci-fi film features the red pill/blue pill scene?",
                "correct_answer": "The Matrix",
                "alternative_answers": ["Matrix"],
                "hint_1": "Keanu Reeves stars in this",
                "hint_2": "Involves a simulated reality",
                "hint_3": "Famous for bullet time effects",
                "difficulty": "easy",
                "explanation": "The Matrix redefined action cinema with its innovative visual effects.",
            },
            {
                "question_type": "text",
                "text": "What 2010 Christopher Nolan film involves dreams within dreams?",
                "correct_answer": "Inception",
                "alternative_answers": [],
                "hint_1": "Directed by Christopher Nolan",
                "hint_2": "Leonardo DiCaprio plays the lead",
                "hint_3": "Features a spinning top",
                "difficulty": "medium",
                "explanation": "Inception explores the concept of shared dreaming and corporate espionage.",
            },
            {
                "question_type": "text",
                "text": "Which 1975 thriller made everyone afraid of sharks?",
                "correct_answer": "Jaws",
                "alternative_answers": [],
                "hint_1": "Directed by Steven Spielberg",
                "hint_2": "Set on Amity Island",
                "hint_3": "Famous theme music: 'Dun dun... dun dun...'",
                "difficulty": "easy",
                "explanation": "Jaws is widely considered the first summer blockbuster.",
            },
            {
                "question_type": "text",
                "text": "What 1972 crime film begins with the line 'I believe in America'?",
                "correct_answer": "The Godfather",
                "alternative_answers": ["Godfather"],
                "hint_1": "Directed by Francis Ford Coppola",
                "hint_2": "Features the Corleone family",
                "hint_3": "Famous for the horse head scene",
                "difficulty": "medium",
                "explanation": "The Godfather is considered one of the greatest films in world cinema.",
            },
            {
                "question_type": "text",
                "text": "Which 1994 Quentin Tarantino film has a non-linear narrative?",
                "correct_answer": "Pulp Fiction",
                "alternative_answers": [],
                "hint_1": "Features John Travolta and Samuel L. Jackson",
                "hint_2": "Famous for the briefcase",
                "hint_3": "Includes the Ezekiel 25:17 speech",
                "difficulty": "easy",
                "explanation": "Pulp Fiction revitalized John Travolta's career and became a cultural phenomenon.",
            },
            {
                "question_type": "text",
                "text": "What 1991 thriller features Hannibal Lecter?",
                "correct_answer": "The Silence of the Lambs",
                "alternative_answers": ["Silence of the Lambs"],
                "hint_1": "Anthony Hopkins won an Oscar for this role",
                "hint_2": "Features Clarice Starling",
                "hint_3": "Famous for 'fava beans and a nice Chianti'",
                "difficulty": "medium",
                "explanation": "The Silence of the Lambs won the 'Big Five' Academy Awards.",
            },
            {
                "question_type": "text",
                "text": "Which 1997 film featured the doomed ship RMS Titanic?",
                "correct_answer": "Titanic",
                "alternative_answers": [],
                "hint_1": "Directed by James Cameron",
                "hint_2": "Starred Leonardo DiCaprio and Kate Winslet",
                "hint_3": "'I'm the king of the world!'",
                "difficulty": "easy",
                "explanation": "Titanic held the record for highest-grossing film for many years.",
            },
            {
                "question_type": "text",
                "text": "What 1977 space opera created by George Lucas became a cultural phenomenon?",
                "correct_answer": "Star Wars",
                "alternative_answers": ["Star Wars: A New Hope", "A New Hope"],
                "hint_1": "Features Luke Skywalker",
                "hint_2": "Has the Force",
                "hint_3": "'May the Force be with you'",
                "difficulty": "easy",
                "explanation": "Star Wars revolutionized special effects and merchandising in cinema.",
            },
        ]

        # Select 10 questions based on day number (cycling through the list)
        # fmt: on
        start_idx = ((day_number - 1) * 10) % len(all_questions)
        selected = []
        for i in range(10):
            idx = (start_idx + i) % len(all_questions)
            selected.append(all_questions[idx])

        return selected

    def _get_tv_questions(self, day_number):  # type: ignore[no-untyped-def]
        """Sample TV show questions."""
        return self._get_movie_questions(day_number)  # Placeholder for now

    def _get_actor_questions(self, day_number):  # type: ignore[no-untyped-def]
        """Sample actor questions."""
        return self._get_movie_questions(day_number)  # Placeholder for now

    def _get_director_questions(self, day_number):  # type: ignore[no-untyped-def]
        """Sample director questions."""
        return self._get_movie_questions(day_number)  # Placeholder for now

    def _get_quote_questions(self, day_number):  # type: ignore[no-untyped-def]
        """Sample quote questions."""
        return self._get_movie_questions(day_number)  # Placeholder for now

    def _schedule_daily_puzzles(self, count):  # type: ignore[no-untyped-def]
        """Schedule daily puzzles for the next N days."""
        quizzes = Quiz.objects.filter(quiz_type="daily").order_by("id")[:count]

        today = timezone.now().date()
        for i, quiz in enumerate(quizzes):
            puzzle_date = today + timedelta(days=i)

            # Check if puzzle already exists for this date
            existing = DailyPuzzle.objects.filter(date=puzzle_date).first()
            if existing:
                self.stdout.write(f"  Skipping {puzzle_date}: already has a puzzle")
                continue

            DailyPuzzle.objects.create(
                date=puzzle_date,
                quiz=quiz,
                is_active=True,
            )
            self.stdout.write(f"  Scheduled quiz for {puzzle_date}")

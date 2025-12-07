"""
Quiz models for PopcornGuess daily trivia game.

Implements the daily game pattern inspired by Wordle - one quiz per day
creates anticipation and builds habit-forming engagement.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    """
    Quiz category for organizing content.

    Examples: Movies, TV Shows, Actors, Directors, Soundtracks
    """

    name = models.CharField(_("name"), max_length=100, unique=True)
    slug = models.SlugField(_("slug"), max_length=100, unique=True)
    description = models.TextField(_("description"), blank=True)
    icon = models.CharField(
        _("icon"),
        max_length=50,
        blank=True,
        help_text=_("Icon name or emoji for the category"),
    )
    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("category")
        verbose_name_plural = _("categories")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Question(models.Model):
    """
    Quiz question with support for multiple formats.

    Question types support the variety needed to keep users engaged:
    - TEXT: Standard text question
    - IMAGE: Movie still or poster-based question
    - QUOTE: Famous movie/TV quote
    - EMOJI: Emoji representation of a movie/show
    - AUDIO: Soundtrack or audio clip (future)
    - SILHOUETTE: Character or actor silhouette
    """

    class QuestionType(models.TextChoices):
        TEXT = "text", _("Text Question")
        IMAGE = "image", _("Image Question")
        QUOTE = "quote", _("Quote Question")
        EMOJI = "emoji", _("Emoji Clues")
        AUDIO = "audio", _("Audio Question")
        SILHOUETTE = "silhouette", _("Silhouette Question")

    class Difficulty(models.TextChoices):
        EASY = "easy", _("Easy")
        MEDIUM = "medium", _("Medium")
        HARD = "hard", _("Hard")

    # Core fields
    question_type = models.CharField(
        _("question type"),
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT,
    )
    text = models.TextField(
        _("question text"),
        help_text=_("The question or clue to display"),
    )
    correct_answer = models.CharField(
        _("correct answer"),
        max_length=255,
        help_text=_("The correct answer (movie/show title, actor name, etc.)"),
    )
    alternative_answers = models.JSONField(
        _("alternative answers"),
        default=list,
        blank=True,
        help_text=_("List of acceptable alternative answers for fuzzy matching"),
    )

    # Content fields based on question type
    image_url = models.URLField(
        _("image URL"),
        blank=True,
        help_text=_("URL for image-based questions"),
    )
    emoji_clues = models.CharField(
        _("emoji clues"),
        max_length=100,
        blank=True,
        help_text=_("Emoji sequence representing the answer"),
    )
    audio_url = models.URLField(
        _("audio URL"),
        blank=True,
        help_text=_("URL for audio-based questions"),
    )

    # Hint system - progressive hints increase engagement
    hint_1 = models.CharField(
        _("hint 1"),
        max_length=255,
        blank=True,
        help_text=_("First hint (e.g., release year)"),
    )
    hint_2 = models.CharField(
        _("hint 2"),
        max_length=255,
        blank=True,
        help_text=_("Second hint (e.g., genre)"),
    )
    hint_3 = models.CharField(
        _("hint 3"),
        max_length=255,
        blank=True,
        help_text=_("Third hint (e.g., director/lead actor)"),
    )

    # Metadata
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questions",
        verbose_name=_("category"),
    )
    difficulty = models.CharField(
        _("difficulty"),
        max_length=10,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM,
    )
    explanation = models.TextField(
        _("explanation"),
        blank=True,
        help_text=_("Fun fact or explanation shown after answering"),
    )

    # Tracking
    times_shown = models.PositiveIntegerField(_("times shown"), default=0)
    times_correct = models.PositiveIntegerField(_("times correct"), default=0)
    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("question")
        verbose_name_plural = _("questions")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["question_type"]),
            models.Index(fields=["difficulty"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_question_type_display()}: {self.text[:50]}..."

    @property
    def success_rate(self) -> float:
        """Calculate the success rate for this question."""
        if self.times_shown == 0:
            return 0.0
        return (self.times_correct / self.times_shown) * 100


class Quiz(models.Model):
    """
    A collection of questions forming a complete quiz.

    Quizzes can be daily challenges or practice mode content.
    """

    class QuizType(models.TextChoices):
        DAILY = "daily", _("Daily Quiz")
        BLITZ = "blitz", _("Fast Blitz")
        PRACTICE = "practice", _("Practice Mode")
        CHALLENGE = "challenge", _("Weekly Challenge")

    title = models.CharField(_("title"), max_length=200)
    slug = models.SlugField(_("slug"), max_length=200, unique=True)
    description = models.TextField(_("description"), blank=True)

    quiz_type = models.CharField(
        _("quiz type"),
        max_length=20,
        choices=QuizType.choices,
        default=QuizType.DAILY,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
        verbose_name=_("category"),
    )
    questions = models.ManyToManyField(
        Question,
        through="QuizQuestion",
        related_name="quizzes",
        verbose_name=_("questions"),
    )

    # Quiz settings
    time_limit_seconds = models.PositiveIntegerField(
        _("time limit (seconds)"),
        null=True,
        blank=True,
        help_text=_("Time limit for timed quizzes (null = no limit)"),
    )
    max_attempts = models.PositiveIntegerField(
        _("max attempts"),
        default=6,
        help_text=_("Maximum guesses per question (Wordle-style)"),
    )

    # Publishing
    is_published = models.BooleanField(_("published"), default=False)
    publish_date = models.DateField(
        _("publish date"),
        null=True,
        blank=True,
        help_text=_("Date when this quiz becomes available"),
    )

    # Tracking
    times_played = models.PositiveIntegerField(_("times played"), default=0)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_quizzes",
        verbose_name=_("created by"),
    )

    class Meta:
        verbose_name = _("quiz")
        verbose_name_plural = _("quizzes")
        ordering = ["-publish_date", "-created_at"]
        indexes = [
            models.Index(fields=["quiz_type"]),
            models.Index(fields=["publish_date"]),
            models.Index(fields=["is_published"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def question_count(self) -> int:
        """Return the number of questions in this quiz."""
        return self.questions.count()


class QuizQuestion(models.Model):
    """
    Through model for Quiz-Question relationship.

    Allows ordering questions within a quiz.
    """

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        verbose_name=_("quiz"),
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        verbose_name=_("question"),
    )
    order = models.PositiveIntegerField(_("order"), default=0)

    class Meta:
        verbose_name = _("quiz question")
        verbose_name_plural = _("quiz questions")
        ordering = ["order"]
        unique_together = [["quiz", "question"]]

    def __str__(self) -> str:
        return f"{self.quiz.title} - Q{self.order}"


class DailyPuzzle(models.Model):
    """
    Manages the daily quiz schedule.

    One quiz per day - this scarcity creates anticipation and
    habit-forming engagement (like Wordle's daily mechanic).
    """

    date = models.DateField(
        _("date"),
        unique=True,
        help_text=_("The date this puzzle is active"),
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="daily_schedules",
        verbose_name=_("quiz"),
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Whether this daily puzzle is currently active"),
    )

    # Stats for community features
    total_attempts = models.PositiveIntegerField(_("total attempts"), default=0)
    total_completions = models.PositiveIntegerField(_("total completions"), default=0)
    average_score = models.FloatField(_("average score"), default=0.0)

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("daily puzzle")
        verbose_name_plural = _("daily puzzles")
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return f"Daily Puzzle: {self.date}"

    @classmethod
    def get_today(cls) -> "DailyPuzzle | None":
        """Get today's daily puzzle."""
        today = timezone.now().date()
        return cls.objects.filter(date=today, is_active=True).first()

    @property
    def completion_rate(self) -> float:
        """Calculate the completion rate for this daily puzzle."""
        if self.total_attempts == 0:
            return 0.0
        return (self.total_completions / self.total_attempts) * 100

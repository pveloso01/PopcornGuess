"""
Analytics models for tracking user progress, streaks, and statistics.

Implements anonymous user tracking (like Wordle's localStorage approach)
and gamification elements to drive retention.
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class AnonymousUser(models.Model):
    """
    Track anonymous users via device ID.

    Allows users to play without registration while still tracking
    progress and streaks - key to reducing friction for new users.
    """

    device_id = models.UUIDField(
        _("device ID"),
        default=uuid.uuid4,
        unique=True,
        editable=False,
        help_text=_("Unique identifier for anonymous user device"),
    )
    # Optional link to registered user (for account migration)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anonymous_profile",
        verbose_name=_("registered user"),
    )

    first_seen = models.DateTimeField(_("first seen"), auto_now_add=True)
    last_seen = models.DateTimeField(_("last seen"), auto_now=True)

    # User preferences (stored locally but synced for registered users)
    timezone_name = models.CharField(
        _("timezone"),
        max_length=50,
        default="UTC",
        help_text=_("User's timezone for daily puzzle timing"),
    )
    notifications_enabled = models.BooleanField(
        _("notifications enabled"),
        default=False,
    )

    class Meta:
        verbose_name = _("anonymous user")
        verbose_name_plural = _("anonymous users")
        ordering = ["-last_seen"]
        indexes = [
            models.Index(fields=["device_id"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self) -> str:
        if self.user:
            return f"Device for {self.user.username}"
        return f"Anonymous: {str(self.device_id)[:8]}..."

    def migrate_to_user(self, user: settings.AUTH_USER_MODEL) -> None:  # type: ignore
        """
        Migrate anonymous progress to a registered user account.

        Called when an anonymous user creates an account.
        """
        self.user = user
        self.save()


class UserProgress(models.Model):
    """
    Track user progress on individual quizzes.

    Records attempts, scores, and completion status.
    """

    # Link to either anonymous or registered user
    anonymous_user = models.ForeignKey(
        AnonymousUser,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="quiz_progress",
        verbose_name=_("anonymous user"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="quiz_progress",
        verbose_name=_("registered user"),
    )
    quiz = models.ForeignKey(
        "quizzes.Quiz",
        on_delete=models.CASCADE,
        related_name="user_progress",
        verbose_name=_("quiz"),
    )

    # Progress tracking
    started_at = models.DateTimeField(_("started at"), auto_now_add=True)
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)
    is_completed = models.BooleanField(_("completed"), default=False)

    # Score tracking
    score = models.PositiveIntegerField(
        _("score"),
        default=0,
        help_text=_("Number of correct answers"),
    )
    total_questions = models.PositiveIntegerField(
        _("total questions"),
        default=0,
    )
    attempts_used = models.PositiveIntegerField(
        _("attempts used"),
        default=0,
        help_text=_("Number of guess attempts made"),
    )

    # Detailed answer tracking (for results display)
    answers = models.JSONField(
        _("answers"),
        default=list,
        help_text=_("List of answers given with correctness"),
    )

    # Time tracking (for blitz mode)
    time_taken_seconds = models.PositiveIntegerField(
        _("time taken (seconds)"),
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _("user progress")
        verbose_name_plural = _("user progress records")
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["anonymous_user", "quiz"]),
            models.Index(fields=["user", "quiz"]),
            models.Index(fields=["is_completed"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(anonymous_user__isnull=False, user__isnull=True)
                    | models.Q(anonymous_user__isnull=True, user__isnull=False)
                ),
                name="user_or_anonymous_required",
            ),
        ]

    def __str__(self) -> str:
        identifier = self.user or self.anonymous_user
        return f"{identifier} - {self.quiz}"

    @property
    def percentage_score(self) -> float:
        """Calculate score as percentage."""
        if self.total_questions == 0:
            return 0.0
        return (self.score / self.total_questions) * 100

    @property
    def is_perfect_score(self) -> bool:
        """Check if user achieved a perfect score."""
        return self.score == self.total_questions and self.total_questions > 0

    def complete(self) -> None:
        """Mark the quiz as completed."""
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save()


class Streak(models.Model):
    """
    Track user streaks for habit-forming engagement.

    Streaks leverage the Zeigarnik effect (unfinished tasks stay in mind)
    and loss aversion (we hate losing progress more than we enjoy gains).
    """

    # Link to either anonymous or registered user
    anonymous_user = models.OneToOneField(
        AnonymousUser,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="streak",
        verbose_name=_("anonymous user"),
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="streak",
        verbose_name=_("registered user"),
    )

    # Streak tracking
    current_streak = models.PositiveIntegerField(
        _("current streak"),
        default=0,
        help_text=_("Current consecutive days played"),
    )
    best_streak = models.PositiveIntegerField(
        _("best streak"),
        default=0,
        help_text=_("Longest streak ever achieved"),
    )
    last_played_date = models.DateField(
        _("last played date"),
        null=True,
        blank=True,
        help_text=_("Date of last quiz completion"),
    )

    # Streak protection (freemium feature)
    streak_freezes_available = models.PositiveIntegerField(
        _("streak freezes available"),
        default=0,
        help_text=_("Number of streak freeze tokens available"),
    )
    streak_freezes_earned = models.PositiveIntegerField(
        _("streak freezes earned"),
        default=0,
        help_text=_("Total number of streak freezes earned from milestones"),
    )
    streak_freeze_used_date = models.DateField(
        _("streak freeze used date"),
        null=True,
        blank=True,
    )

    # Milestone tracking
    total_days_played = models.PositiveIntegerField(
        _("total days played"),
        default=0,
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("streak")
        verbose_name_plural = _("streaks")
        ordering = ["-current_streak"]
        indexes = [
            models.Index(fields=["current_streak"]),
            models.Index(fields=["best_streak"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(anonymous_user__isnull=False, user__isnull=True)
                    | models.Q(anonymous_user__isnull=True, user__isnull=False)
                ),
                name="streak_user_or_anonymous_required",
            ),
        ]

    def __str__(self) -> str:
        identifier = self.user or self.anonymous_user
        return f"{identifier}: {self.current_streak} day streak"

    def update_streak(  # type: ignore[no-untyped-def]
        self, completion_date=None
    ) -> bool:
        """
        Update streak based on quiz completion.

        Returns True if streak was extended, False if it was reset.
        """
        if completion_date is None:
            completion_date = timezone.now().date()

        if self.last_played_date is None:
            # First time playing
            self.current_streak = 1
            self.best_streak = 1
            self.total_days_played = 1
            self.last_played_date = completion_date
            self.save()
            self._check_and_award_milestone_freezes()
            return True

        days_since_last = (completion_date - self.last_played_date).days

        if days_since_last == 0:
            # Already played today
            return True
        elif days_since_last == 1:
            # Consecutive day - extend streak
            self.current_streak += 1
            self.best_streak = max(self.best_streak, self.current_streak)
            self.total_days_played += 1
            self.last_played_date = completion_date
            self.save()
            self._check_and_award_milestone_freezes()
            return True
        elif days_since_last == 2 and self._can_use_streak_freeze():
            # Missed one day but can use streak freeze
            self._use_streak_freeze()
            self.current_streak += 1
            self.best_streak = max(self.best_streak, self.current_streak)
            self.total_days_played += 1
            self.last_played_date = completion_date
            self.save()
            self._check_and_award_milestone_freezes()
            return True
        else:
            # Streak broken
            self.current_streak = 1
            self.total_days_played += 1
            self.last_played_date = completion_date
            self.save()
            return False

    def _check_and_award_milestone_freezes(self) -> None:
        """
        Award streak freezes at milestone achievements.

        Awards:
        - 1 freeze at 7-day milestone
        - 2 freezes at 30-day milestone
        - 3 freezes at 100-day milestone
        """
        milestones = {
            7: 1,
            30: 2,
            100: 3,
        }

        for milestone, freeze_count in milestones.items():
            if self.current_streak == milestone:
                self.streak_freezes_available += freeze_count
                self.streak_freezes_earned += freeze_count
                self.save()
                break

    def _can_use_streak_freeze(self) -> bool:
        """Check if user can use a streak freeze."""
        return self.streak_freezes_available > 0

    def _use_streak_freeze(self) -> None:
        """Use a streak freeze to protect the streak."""
        if self.streak_freezes_available > 0:
            self.streak_freezes_available -= 1
            self.streak_freeze_used_date = timezone.now().date()
            self.save(
                update_fields=[
                    "streak_freezes_available",
                    "streak_freeze_used_date",
                ]
            )


class UserStats(models.Model):
    """
    Aggregated statistics for gamification and leaderboards.
    """

    # Link to either anonymous or registered user
    anonymous_user = models.OneToOneField(
        AnonymousUser,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="stats",
        verbose_name=_("anonymous user"),
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="stats",
        verbose_name=_("registered user"),
    )

    # Quiz statistics
    total_quizzes_played = models.PositiveIntegerField(
        _("total quizzes played"),
        default=0,
    )
    total_quizzes_completed = models.PositiveIntegerField(
        _("total quizzes completed"),
        default=0,
    )
    total_questions_answered = models.PositiveIntegerField(
        _("total questions answered"),
        default=0,
    )
    total_correct_answers = models.PositiveIntegerField(
        _("total correct answers"),
        default=0,
    )
    perfect_scores = models.PositiveIntegerField(
        _("perfect scores"),
        default=0,
        help_text=_("Number of quizzes with 100% score"),
    )

    # Score statistics
    total_score = models.PositiveIntegerField(
        _("total score"),
        default=0,
    )
    average_score = models.FloatField(
        _("average score"),
        default=0.0,
    )
    best_score = models.PositiveIntegerField(
        _("best score"),
        default=0,
    )

    # Time statistics (for blitz mode)
    fastest_completion_seconds = models.PositiveIntegerField(
        _("fastest completion (seconds)"),
        null=True,
        blank=True,
    )
    average_completion_seconds = models.FloatField(
        _("average completion (seconds)"),
        null=True,
        blank=True,
    )

    # Leaderboard ranking
    global_rank = models.PositiveIntegerField(
        _("global rank"),
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("user stats")
        verbose_name_plural = _("user stats")
        ordering = ["-total_score"]
        indexes = [
            models.Index(fields=["total_score"]),
            models.Index(fields=["global_rank"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(anonymous_user__isnull=False, user__isnull=True)
                    | models.Q(anonymous_user__isnull=True, user__isnull=False)
                ),
                name="stats_user_or_anonymous_required",
            ),
        ]

    def __str__(self) -> str:
        identifier = self.user or self.anonymous_user
        return f"Stats for {identifier}"

    @property
    def accuracy(self) -> float:
        """Calculate overall accuracy percentage."""
        if self.total_questions_answered == 0:
            return 0.0
        return (self.total_correct_answers / self.total_questions_answered) * 100

    def update_from_progress(self, progress: UserProgress) -> None:
        """
        Update stats from a completed quiz progress.
        """
        self.total_quizzes_played += 1

        if progress.is_completed:
            self.total_quizzes_completed += 1
            self.total_questions_answered += progress.total_questions
            self.total_correct_answers += progress.score
            self.total_score += progress.score

            if progress.is_perfect_score:
                self.perfect_scores += 1

            if progress.score > self.best_score:
                self.best_score = progress.score

            # Update average score
            if self.total_quizzes_completed > 0:
                self.average_score = self.total_score / self.total_quizzes_completed

            # Update time stats for blitz mode
            if progress.time_taken_seconds:
                if (
                    self.fastest_completion_seconds is None
                    or progress.time_taken_seconds < self.fastest_completion_seconds
                ):
                    self.fastest_completion_seconds = progress.time_taken_seconds

        self.save()


class DailyQuizStats(models.Model):
    """
    Track daily community statistics for quizzes.

    Shows how many people played, completion rates, etc.
    This drives social proof and community engagement.
    """

    date = models.DateField(_("date"), unique_for_date="quiz")
    quiz = models.ForeignKey(
        "quizzes.Quiz",
        on_delete=models.CASCADE,
        related_name="daily_stats",
        verbose_name=_("quiz"),
    )

    # Participation stats
    total_attempts = models.PositiveIntegerField(
        _("total attempts"),
        default=0,
        help_text=_("Total number of times the quiz was started"),
    )
    total_completions = models.PositiveIntegerField(
        _("total completions"),
        default=0,
        help_text=_("Total number of times the quiz was completed"),
    )

    # Performance stats
    average_score = models.FloatField(
        _("average score"),
        default=0.0,
        help_text=_("Average score across all completions"),
    )
    total_score = models.PositiveIntegerField(
        _("total score"),
        default=0,
        help_text=_("Sum of all scores for calculating average"),
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("daily quiz stats")
        verbose_name_plural = _("daily quiz stats")
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["date", "quiz"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["date", "quiz"],
                name="unique_daily_quiz_stats",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.quiz} stats for {self.date}"

    @property
    def completion_rate(self) -> float:
        """Calculate completion rate percentage."""
        if self.total_attempts == 0:
            return 0.0
        return (self.total_completions / self.total_attempts) * 100

    def record_attempt(self) -> None:
        """Record a quiz attempt."""
        self.total_attempts += 1
        self.save()

    def record_completion(self, score: int) -> None:
        """Record a quiz completion with score."""
        self.total_completions += 1
        self.total_score += score

        # Update average score
        if self.total_completions > 0:
            self.average_score = self.total_score / self.total_completions

        self.save()

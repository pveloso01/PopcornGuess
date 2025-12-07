"""
Admin configuration for Quiz models.
"""

from django.contrib import admin

from .models import Category, DailyPuzzle, Question, Quiz, QuizQuestion


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin configuration for Category model."""

    list_display = ["name", "slug", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["name"]


class QuizQuestionInline(admin.TabularInline):
    """Inline for managing questions within a quiz."""

    model = QuizQuestion
    extra = 1
    ordering = ["order"]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    """Admin configuration for Question model."""

    list_display = [
        "id",
        "question_type",
        "text_preview",
        "correct_answer",
        "difficulty",
        "category",
        "is_active",
        "success_rate_display",
    ]
    list_filter = ["question_type", "difficulty", "category", "is_active"]
    search_fields = ["text", "correct_answer"]
    readonly_fields = ["times_shown", "times_correct", "created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = [
        (
            "Question Content",
            {
                "fields": [
                    "question_type",
                    "text",
                    "correct_answer",
                    "alternative_answers",
                ]
            },
        ),
        (
            "Media Content",
            {
                "fields": ["image_url", "emoji_clues", "audio_url"],
                "classes": ["collapse"],
            },
        ),
        (
            "Hints",
            {
                "fields": ["hint_1", "hint_2", "hint_3"],
                "classes": ["collapse"],
            },
        ),
        (
            "Metadata",
            {
                "fields": ["category", "difficulty", "explanation", "is_active"],
            },
        ),
        (
            "Statistics",
            {
                "fields": [
                    "times_shown",
                    "times_correct",
                    "created_at",
                    "updated_at",
                ],
                "classes": ["collapse"],
            },
        ),
    ]

    @admin.display(description="Text Preview")
    def text_preview(self, obj: Question) -> str:
        """Return truncated question text."""
        return obj.text[:50] + "..." if len(obj.text) > 50 else obj.text

    @admin.display(description="Success Rate")
    def success_rate_display(self, obj: Question) -> str:
        """Return formatted success rate."""
        return f"{obj.success_rate:.1f}%"


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    """Admin configuration for Quiz model."""

    list_display = [
        "title",
        "quiz_type",
        "category",
        "question_count",
        "is_published",
        "publish_date",
        "times_played",
    ]
    list_filter = ["quiz_type", "category", "is_published"]
    search_fields = ["title", "description"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ["times_played", "created_at", "updated_at"]
    date_hierarchy = "publish_date"
    inlines = [QuizQuestionInline]

    fieldsets = [
        (
            "Basic Information",
            {
                "fields": ["title", "slug", "description", "quiz_type", "category"],
            },
        ),
        (
            "Settings",
            {
                "fields": ["time_limit_seconds", "max_attempts"],
            },
        ),
        (
            "Publishing",
            {
                "fields": ["is_published", "publish_date"],
            },
        ),
        (
            "Statistics",
            {
                "fields": ["times_played", "created_at", "updated_at", "created_by"],
                "classes": ["collapse"],
            },
        ),
    ]

    @admin.display(description="Questions")
    def question_count(self, obj: Quiz) -> int:
        """Return the number of questions in the quiz."""
        return obj.question_count


@admin.register(DailyPuzzle)
class DailyPuzzleAdmin(admin.ModelAdmin):
    """Admin configuration for DailyPuzzle model."""

    list_display = [
        "date",
        "quiz",
        "is_active",
        "total_attempts",
        "total_completions",
        "completion_rate_display",
    ]
    list_filter = ["is_active"]
    search_fields = ["quiz__title"]
    readonly_fields = [
        "total_attempts",
        "total_completions",
        "average_score",
        "created_at",
    ]
    date_hierarchy = "date"

    @admin.display(description="Completion Rate")
    def completion_rate_display(self, obj: DailyPuzzle) -> str:
        """Return formatted completion rate."""
        return f"{obj.completion_rate:.1f}%"

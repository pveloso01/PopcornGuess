"""
Serializers for Quiz API endpoints.
"""

from rest_framework import serializers

from .models import Category, DailyPuzzle, Question, Quiz


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for quiz categories."""

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon"]


class QuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz questions.

    Hides the correct answer until the user has submitted their answer.
    """

    category = CategorySerializer(read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "question_type",
            "text",
            "image_url",
            "emoji_clues",
            "audio_url",
            "difficulty",
            "category",
            "target_kind",
        ]


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    """
    Serializer for questions that includes the answer.

    Used after the user has completed the quiz.
    """

    category = CategorySerializer(read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "question_type",
            "text",
            "correct_answer",
            "image_url",
            "emoji_clues",
            "audio_url",
            "hint_1",
            "hint_2",
            "hint_3",
            "difficulty",
            "category",
            "explanation",
        ]


class QuizListSerializer(serializers.ModelSerializer):
    """Serializer for quiz list view."""

    category = CategorySerializer(read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "quiz_type",
            "category",
            "question_count",
            "time_limit_seconds",
            "max_attempts",
            "publish_date",
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz detail view.

    Includes questions but hides answers. Only **classified** questions
    (target_kind is 'movie' or 'tv') are exposed — questions still in
    the 'any' review queue are filtered out so the autocomplete combobox
    can always trust the kind label.
    """

    category = CategorySerializer(read_only=True)
    questions = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "quiz_type",
            "category",
            "questions",
            "question_count",
            "time_limit_seconds",
            "max_attempts",
            "publish_date",
        ]

    def _classified_questions(self, obj):  # type: ignore[no-untyped-def]
        # Drop anything still in the 'any' review queue. The daily quiz
        # would rather be shorter than mislabel a kind.
        return obj.questions.exclude(target_kind="any")

    def get_questions(self, obj):  # type: ignore[no-untyped-def]
        return QuestionSerializer(
            self._classified_questions(obj), many=True
        ).data

    def get_question_count(self, obj):  # type: ignore[no-untyped-def]
        return self._classified_questions(obj).count()


class DailyPuzzleSerializer(serializers.ModelSerializer):
    """Serializer for today's daily puzzle."""

    quiz = QuizDetailSerializer(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = DailyPuzzle
        fields = [
            "id",
            "date",
            "quiz",
            "total_attempts",
            "total_completions",
            "completion_rate",
            "average_score",
        ]


class AnswerSubmissionSerializer(serializers.Serializer):
    """Serializer for submitting an answer to a question."""

    question_id = serializers.IntegerField()
    answer = serializers.CharField(max_length=255)
    attempt_number = serializers.IntegerField(min_value=1)

    def validate_question_id(self, value: int) -> int:
        """Validate that the question exists."""
        if not Question.objects.filter(id=value).exists():
            raise serializers.ValidationError("Question not found.")
        return value


class AnswerResultSerializer(serializers.Serializer):
    """Serializer for answer validation result."""

    is_correct = serializers.BooleanField()
    correct_answer = serializers.CharField(allow_null=True)
    hint = serializers.CharField(allow_null=True)
    attempts_remaining = serializers.IntegerField()
    explanation = serializers.CharField(allow_null=True)


class CommunityStatsSerializer(serializers.Serializer):
    """Serializer for community statistics."""

    total_attempts = serializers.IntegerField()
    total_completions = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    average_score = serializers.FloatField()


class QuestionWithStatsSerializer(serializers.Serializer):
    """Serializer for questions with answers and stats."""

    id = serializers.IntegerField()
    text = serializers.CharField()
    correct_answer = serializers.CharField()
    explanation = serializers.CharField(allow_null=True, allow_blank=True)
    image_url = serializers.CharField(allow_null=True, allow_blank=True)
    success_rate = serializers.FloatField()


class QuizResultsSerializer(serializers.Serializer):
    """Serializer for quiz completion results."""

    quiz_id = serializers.IntegerField()
    quiz_title = serializers.CharField()
    score = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    percentage = serializers.FloatField()
    is_perfect = serializers.BooleanField()
    time_taken_seconds = serializers.IntegerField(allow_null=True)
    questions_with_answers = QuestionWithStatsSerializer(many=True)
    community_stats = CommunityStatsSerializer()
    shareable_text = serializers.CharField()


class HintRequestSerializer(serializers.Serializer):
    """Serializer for requesting a hint."""

    question_id = serializers.IntegerField()
    hint_number = serializers.IntegerField(min_value=1, max_value=3)

    def validate_question_id(self, value: int) -> int:
        """Validate that the question exists."""
        if not Question.objects.filter(id=value).exists():
            raise serializers.ValidationError("Question not found.")
        return value


class HintResponseSerializer(serializers.Serializer):
    """Serializer for hint response."""

    hint = serializers.CharField()
    hint_number = serializers.IntegerField()
    hints_remaining = serializers.IntegerField()

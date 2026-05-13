"""
Data migration: coerce any remaining Question.target_kind='any' rows
to 'movie' before the model-level enum drops the 'any' choice.

Background: target_kind was introduced in 0004 with a default of 'any'.
0005 removes 'any' from the choices and changes the default to 'movie'.
This migration sits between them at the data layer so no row is left
with an orphaned value the model no longer recognises.
"""

from django.db import migrations


def coerce_any_to_movie(apps, schema_editor):
    Question = apps.get_model("quizzes", "Question")
    Question.objects.filter(target_kind="any").update(target_kind="movie")


def reverse_noop(apps, schema_editor):
    # No reverse needed — once collapsed there is no information about
    # which rows were originally 'any'.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("quizzes", "0005_alter_question_target_kind"),
    ]

    operations = [
        migrations.RunPython(coerce_any_to_movie, reverse_noop),
    ]

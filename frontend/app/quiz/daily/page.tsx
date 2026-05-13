'use client';

/**
 * Daily Quiz Page
 *
 * Main quiz interface for the daily puzzle
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizQuestion from '@/components/QuizQuestion';
import AnswerInput from '@/components/AnswerInput';
import QuizProgressTrail from '@/components/QuizProgressTrail';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { useQuizSession } from '@/hooks/useQuizSession';
import api from '@/lib/api';

interface DailyQuiz {
  id: number;
  quiz: {
    id: number;
    title: string;
    questions: Array<{
      id: number;
      question_type: string;
      text: string;
      image_url?: string;
      emoji_clues?: string;
      hint_1?: string;
      hint_2?: string;
      hint_3?: string;
      /** Restricts answer autocomplete to a media kind. */
      target_kind?: 'movie' | 'tv';
    }>;
  };
}

export default function DailyQuizPage() {
  const router = useRouter();
  const { deviceId, isLoading: userLoading } = useAnonymousUser();
  const {
    session,
    isLoading: sessionLoading,
    startSession,
    submitAnswer,
    nextQuestion,
    completeSession,
    getCurrentQuestion,
  } = useQuizSession();

  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  // The current answer string is owned by AnswerInput's combobox now;
  // we receive it on submit via the onSubmit callback. No mirror state
  // needed here — keeping one would only re-introduce the stale-closure
  // bug that hid the submit silently.
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load daily quiz
  useEffect(() => {
    const loadDailyQuiz = async () => {
      if (!deviceId) return;

      try {
        const data = (await api.quizzes.getDaily(deviceId)) as DailyQuiz;
        setDailyQuiz(data);
      } catch (error) {
        console.error('Failed to load daily quiz:', error);
      }
    };

    loadDailyQuiz();
  }, [deviceId]);

  // Start session when quiz is loaded
  useEffect(() => {
    if (dailyQuiz && deviceId && !session) {
      startSession(dailyQuiz.quiz.id, dailyQuiz.quiz.questions, deviceId);
    }
  }, [dailyQuiz, deviceId, session, startSession]);

  const handleSubmitAnswer = async (answer: string) => {
    // The answer is passed in directly rather than read from
    // `currentAnswer` state — AnswerInput calls onSubmit synchronously
    // from a keystroke handler, before React has flushed the
    // setCurrentAnswer that fired on the same tick. Reading from state
    // here would see the previous render's value (the classic stale
    // closure) and the submit would silently no-op.
    const trimmed = answer.trim();
    if (!trimmed || !session || !deviceId || !dailyQuiz) return;

    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    const nextAttempt = attempts + 1;
    setIsSubmitting(true);
    setAttempts(nextAttempt);

    try {
      const result = (await api.quizzes.submitAnswer(
        {
          quiz_id: dailyQuiz.quiz.id,
          question_id: currentQuestion.id,
          answer: trimmed,
          attempt_number: nextAttempt,
        },
        deviceId
      )) as {
        is_correct: boolean;
        correct_answer: string | null;
        hint: string | null;
        attempts_remaining: number;
      };

      await submitAnswer(
        currentQuestion.id,
        trimmed,
        result.is_correct,
        nextAttempt,
        deviceId
      );

      if (result.is_correct) {
        setFeedback({
          isCorrect: true,
          message: 'Correct! 🎉',
        });

        // Pause long enough for the green dot + 'Correct!' banner to
        // register visually before the next question replaces them.
        // 1.5s read like a flash to playtesters; 2.2s lands cleanly.
        setTimeout(() => {
          if (session.currentQuestionIndex < session.questions.length - 1) {
            nextQuestion();
            setAttempts(0);
            setFeedback(null);
          } else {
            // Quiz complete
            completeSession(deviceId);
            router.push(`/quiz/results?quiz=${session.quizId}`);
          }
        }, 2200);
      } else {
        setFeedback({
          isCorrect: false,
          message: result.hint
            ? `Not quite. Hint: ${result.hint}`
            : `Incorrect. ${result.attempts_remaining} attempts remaining.`,
        });

        if (result.attempts_remaining === 0) {
          // No more attempts, move to next
          setTimeout(() => {
            if (session.currentQuestionIndex < session.questions.length - 1) {
              nextQuestion();
              setAttempts(0);
              setFeedback(null);
            } else {
              completeSession(deviceId);
              router.push(`/quiz/results?quiz=${session.quizId}`);
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setFeedback({
        isCorrect: false,
        message: 'Error submitting answer. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || sessionLoading || !session || !dailyQuiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading today&apos;s quiz...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const progress = session.currentQuestionIndex + 1;
  const total = session.questions.length;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[var(--text-primary)]">Daily Quiz</span>
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-[var(--text-secondary)]">{dailyQuiz.quiz.title}</p>
            <div className="text-[var(--text-secondary)] font-medium">
              Question {progress} of {total}
            </div>
          </div>
        </div>

        {/* Progress trail — one marker per question, green for correct,
            red for incorrect, gold ring on the active one. Replaces the
            old amber progress bar + numeric scoreboard. */}
        <div className="mb-8">
          <QuizProgressTrail
            questions={session.questions.map((q) => ({ id: q.id }))}
            answers={session.answers.map((a) => ({
              questionId: a.questionId,
              isCorrect: a.isCorrect,
            }))}
            currentQuestionIndex={session.currentQuestionIndex}
          />
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="mb-8">
            <QuizQuestion
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              question={currentQuestion as any}
              questionNumber={progress}
              totalQuestions={total}
            />
          </div>
        )}

        {/* Answer Input */}
        <div className="mb-6">
          <AnswerInput
            onSubmit={(answer) => handleSubmitAnswer(answer)}
            isCorrect={feedback?.isCorrect || null}
            attemptsUsed={attempts}
            maxAttempts={6}
            disabled={isSubmitting}
            placeholder={
              currentQuestion?.target_kind === 'movie'
                ? 'Type a movie title…'
                : currentQuestion?.target_kind === 'tv'
                  ? 'Type a TV show title…'
                  : 'Type a movie or TV show…'
            }
            useTitleAutocomplete
            autocompleteKind={currentQuestion?.target_kind ?? 'movie'}
          />
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              feedback.isCorrect
                ? 'bg-green-500/10 border border-green-500/20 text-green-600'
                : 'bg-red-500/10 border border-red-500/20 text-red-600'
            }`}
          >
            <p className="font-medium">{feedback.message}</p>
          </div>
        )}

        {/* No live score during play — genre convention. Every Wordle
            clone (Wordle, LoLdle, Pokedle, Framed, Moviedle, etc.)
            uses the attempt-slot count itself as the progress indicator
            and saves the score reveal for the end-of-game stats modal.
            Mid-game numeric scoreboards feel mobile-freemium, not
            "elegant daily ritual." Stats and share grid live on
            /quiz/results when the quiz completes. */}
      </div>
    </div>
  );
}

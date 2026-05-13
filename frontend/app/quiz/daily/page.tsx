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
  const [currentAnswer, setCurrentAnswer] = useState('');
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

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !session || !deviceId || !dailyQuiz) return;

    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setAttempts(attempts + 1);

    try {
      // Submit to answer validation endpoint
      const result = (await api.quizzes.submitAnswer(
        {
          quiz_id: dailyQuiz.quiz.id,
          question_id: currentQuestion.id,
          answer: currentAnswer,
          attempt_number: attempts + 1,
        },
        deviceId
      )) as {
        is_correct: boolean;
        correct_answer: string | null;
        hint: string | null;
        attempts_remaining: number;
      };

      // Update session with answer
      await submitAnswer(
        currentQuestion.id,
        currentAnswer,
        result.is_correct,
        attempts + 1,
        deviceId
      );

      if (result.is_correct) {
        setFeedback({
          isCorrect: true,
          message: 'Correct! 🎉',
        });

        // Move to next question after delay
        setTimeout(() => {
          if (session.currentQuestionIndex < session.questions.length - 1) {
            nextQuestion();
            setCurrentAnswer('');
            setAttempts(0);
            setFeedback(null);
          } else {
            // Quiz complete
            completeSession(deviceId);
            router.push(`/quiz/results?quiz=${session.quizId}`);
          }
        }, 1500);
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
              setCurrentAnswer('');
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

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-[var(--background-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-amber transition-all duration-300"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
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
            onSubmit={(answer) => {
              setCurrentAnswer(answer);
              handleSubmitAnswer();
            }}
            isCorrect={feedback?.isCorrect || null}
            attemptsUsed={attempts}
            maxAttempts={6}
            disabled={isSubmitting}
            placeholder="Type a movie or TV show..."
            useTitleAutocomplete
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

        {/* Score */}
        <div className="mt-8 text-center">
          <p className="text-[var(--text-secondary)]">
            Current Score:{' '}
            <span className="text-[var(--text-primary)] font-bold">{session.score}</span> /{' '}
            {progress - 1}
          </p>
        </div>
      </div>
    </div>
  );
}

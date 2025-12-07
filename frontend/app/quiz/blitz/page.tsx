'use client';

/**
 * Blitz Quiz Page
 *
 * Fast-paced quiz mode with:
 * - Countdown timer (60 seconds)
 * - Rapid-fire questions
 * - Time bonus scoring
 * - Leaderboard integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CountdownTimer from '@/components/CountdownTimer';
import QuizQuestion from '@/components/QuizQuestion';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import api from '@/lib/api';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';

interface Question {
  id: number;
  question_type: string;
  text: string;
  image_url?: string;
  emoji_clues?: string;
  audio_url?: string;
  category?: { name: string };
  difficulty: string;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  quiz_type: string;
  max_attempts: number;
  time_limit_seconds: number;
  questions: Question[];
}

export default function BlitzQuizPage() {
  const router = useRouter();
  const { deviceId } = useAnonymousUser();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<
    Array<{
      questionId: number;
      answer: string;
      isCorrect: boolean;
      attemptsUsed: number;
    }>
  >([]);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const currentQuestion = quiz?.questions[currentQuestionIndex] || null;

  // Fetch blitz quiz
  useEffect(() => {
    const loadBlitzQuiz = async () => {
      if (!deviceId) return;

      try {
        setIsLoading(true);
        const data = await api.quizzes.getBlitz(deviceId);
        setQuiz(data);
        setStartTime(Date.now());
      } catch (err) {
        const fetchError = err instanceof Error ? err : new Error('Failed to fetch blitz quiz');
        setError(fetchError);
        console.error('Error fetching blitz quiz:', fetchError);
      } finally {
        setIsLoading(false);
      }
    };

    loadBlitzQuiz();
  }, [deviceId]);

  const handleTimeUp = useCallback(() => {
    setIsQuizCompleted(true);
    // Calculate final score and redirect to results
    const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    router.push(`/quiz/results?quiz=${quiz?.id}&score=${score}&time=${timeTaken}`);
  }, [quiz, score, startTime, router]);

  const handleAnswerSubmit = async (answer: string) => {
    if (!currentQuestion || !deviceId || !quiz) return;

    try {
      const result = await api.quizzes.submitAnswer(
        {
          quiz_id: quiz.id,
          question_id: currentQuestion.id,
          answer,
          attempt_number: 1, // Blitz mode only allows 1 attempt
        },
        deviceId
      );

      const answerRecord = {
        questionId: currentQuestion.id,
        answer,
        isCorrect: result.is_correct,
        attemptsUsed: 1,
      };

      setUserAnswers([...userAnswers, answerRecord]);

      if (result.is_correct) {
        setScore((prev) => prev + 1);
      }

      // Auto-advance to next question after short delay
      setTimeout(() => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        } else {
          // Quiz completed
          setIsQuizCompleted(true);
          const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
          router.push(`/quiz/results?quiz=${quiz.id}&score=${score + 1}&time=${timeTaken}`);
        }
      }, 1000);
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ErrorMessage message={error?.message || 'No blitz quiz available'} />
      </div>
    );
  }

  if (isQuizCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-3xl font-bold mb-4">Time&apos;s Up!</h1>
        <p className="text-xl">Redirecting to results...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Header with Timer */}
      <div className="w-full max-w-2xl mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
            ⚡ Blitz Mode
          </h1>
          <p className="text-[var(--text-secondary)]">
            Question {currentQuestionIndex + 1}/{quiz.questions.length} | Score: {score}
          </p>
        </div>
        <CountdownTimer
          totalSeconds={quiz.time_limit_seconds || 60}
          onTimeUp={handleTimeUp}
          isPaused={isQuizCompleted}
        />
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="w-full max-w-2xl">
          <QuizQuestion
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quiz.questions.length}
            attemptsLeft={1}
            maxAttempts={1}
            onSubmitAnswer={handleAnswerSubmit}
            showFeedback={false}
            lastAnswerResult={null}
            onNext={() => {}}
            isSubmitting={false}
          />
        </div>
      )}
    </div>
  );
}

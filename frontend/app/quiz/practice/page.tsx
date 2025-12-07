'use client';

/**
 * Practice Mode Page
 *
 * Endless practice mode with:
 * - Random questions
 * - No time limit
 * - Optional hints
 * - No streak tracking
 * - Category/difficulty filters
 */

import { useState, useEffect } from 'react';
import QuizQuestion from '@/components/QuizQuestion';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';

type QuestionType = 'text' | 'image' | 'quote' | 'emoji' | 'audio' | 'silhouette';

interface Question {
  id: number;
  question_type: QuestionType;
  text: string;
  image_url?: string;
  emoji_clues?: string;
  audio_url?: string;
  category?: { name: string };
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function PracticeModePage() {
  const { deviceId } = useAnonymousUser();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showHints, setShowHints] = useState(true);

  const currentQuestion = questions[currentIndex];

  // Load initial questions
  useEffect(() => {
    loadMoreQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreQuestions = async () => {
    if (!deviceId) return;

    setIsLoading(true);
    try {
      const newQuestions = (await api.quizzes.getPractice(deviceId, {
        count: 10,
      })) as Question[];
      setQuestions((prev) => [...prev, ...newQuestions]);
    } catch (error) {
      console.error('Failed to load practice questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (answer: string) => {
    if (!currentQuestion || !deviceId) return;

    try {
      const result = (await api.quizzes.submitAnswer(
        {
          quiz_id: 0, // Practice mode doesn't have a quiz ID
          question_id: currentQuestion.id,
          answer,
          attempt_number: 1,
        },
        deviceId
      )) as { is_correct: boolean };

      if (result.is_correct) {
        setScore((prev) => prev + 1);
      }
      setTotalAnswered((prev) => prev + 1);

      // Move to next question after short delay
      setTimeout(() => {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);

        // Load more questions when approaching the end
        if (nextIndex >= questions.length - 3) {
          loadMoreQuestions();
        }
      }, 1500);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  if (!currentQuestion && isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
              🎯 Practice Mode
            </h1>
            <p className="text-[var(--text-secondary)]">
              Score: {score}/{totalAnswered} (
              {totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0}%)
            </p>
          </div>
          <button
            onClick={() => setShowHints(!showHints)}
            className="px-4 py-2 rounded-lg bg-[var(--background-secondary)] hover:bg-[var(--background)] transition-colors"
          >
            {showHints ? '💡 Hints: ON' : '🚫 Hints: OFF'}
          </button>
        </div>

        {/* Progress info */}
        <div className="bg-[var(--background-secondary)] rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span>Questions answered: {totalAnswered}</span>
            <span>
              Accuracy: {totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="w-full max-w-2xl">
          <QuizQuestion
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            attemptsLeft={6}
            maxAttempts={6}
            onSubmitAnswer={handleAnswerSubmit}
            showFeedback={false}
            lastAnswerResult={null}
            onNext={() => {}}
            isSubmitting={false}
          />
        </div>
      )}

      {/* Info */}
      <div className="mt-8 text-center text-[var(--text-secondary)]">
        <p>Practice mode is endless - keep playing to improve your skills!</p>
        <p className="text-sm mt-2">No streaks or time limits. Just pure fun! 🎬</p>
      </div>
    </div>
  );
}

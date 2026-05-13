/**
 * Hook for managing quiz session state
 */

import { useState, useCallback, useEffect } from 'react';
import api from '@/lib/api';
import { saveQuizProgress } from '@/lib/storage';

interface Question {
  id: number;
  question_type: string;
  text: string;
  image_url?: string;
  emoji_clues?: string;
  hint_1?: string;
  hint_2?: string;
  hint_3?: string;
  /** Restricts answer autocomplete to a media kind. */
  target_kind?: 'movie' | 'tv' | 'any';
}

interface QuizSession {
  progressId: number;
  quizId: number;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Array<{
    questionId: number;
    answer: string;
    isCorrect: boolean;
    attemptsUsed: number;
  }>;
  score: number;
  isCompleted: boolean;
  startTime: number;
}

interface UseQuizSessionReturn {
  session: QuizSession | null;
  isLoading: boolean;
  error: Error | null;
  startSession: (quizId: number, questions: Question[], deviceId?: string) => Promise<void>;
  submitAnswer: (
    questionId: number,
    answer: string,
    isCorrect: boolean,
    attemptsUsed: number,
    deviceId?: string
  ) => Promise<void>;
  nextQuestion: () => void;
  completeSession: (deviceId?: string) => Promise<void>;
  getCurrentQuestion: () => Question | null;
}

/**
 * Hook to manage quiz session state and progress
 */
export function useQuizSession(): UseQuizSessionReturn {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Start a new quiz session
   */
  const startSession = useCallback(
    async (quizId: number, questions: Question[], deviceId?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // Call backend to create progress record
        const response = (await api.progress.start(quizId, deviceId)) as {
          id: number;
        };

        const newSession: QuizSession = {
          progressId: response.id,
          quizId,
          questions,
          currentQuestionIndex: 0,
          answers: [],
          score: 0,
          isCompleted: false,
          startTime: Date.now(),
        };

        setSession(newSession);

        // Save to localStorage
        saveQuizProgress({
          quizId: quizId.toString(),
          score: 0,
          totalQuestions: questions.length,
          answers: [],
          isCompleted: false,
          startedAt: Date.now(),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to start session');
        setError(error);
        console.error('Failed to start quiz session:', error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Submit an answer for the current question
   */
  const submitAnswer = useCallback(
    async (
      questionId: number,
      answer: string,
      isCorrect: boolean,
      attemptsUsed: number,
      deviceId?: string
    ) => {
      if (!session) return;

      try {
        setError(null);

        const answerData = {
          questionId,
          answer,
          isCorrect,
          attemptsUsed,
        };

        // Update backend
        await api.progress.submit(session.progressId, answerData, deviceId);

        // Update local session
        const updatedSession = {
          ...session,
          answers: [...session.answers, answerData],
          score: isCorrect ? session.score + 1 : session.score,
        };

        setSession(updatedSession);

        // Update localStorage
        saveQuizProgress({
          quizId: session.quizId.toString(),
          score: updatedSession.score,
          totalQuestions: session.questions.length,
          answers: updatedSession.answers,
          isCompleted: false,
          startedAt: session.startTime,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to submit answer');
        setError(error);
        console.error('Failed to submit answer:', error);
      }
    },
    [session]
  );

  /**
   * Move to next question
   */
  const nextQuestion = useCallback(() => {
    if (!session) return;

    setSession({
      ...session,
      currentQuestionIndex: session.currentQuestionIndex + 1,
    });
  }, [session]);

  /**
   * Complete the quiz session
   */
  const completeSession = useCallback(
    async (deviceId?: string) => {
      if (!session) return;

      try {
        setIsLoading(true);
        setError(null);

        const timeTaken = Math.floor((Date.now() - session.startTime) / 1000);

        // Call backend to finalize
        await api.progress.complete(session.progressId, timeTaken, deviceId);

        // Update local session
        const completedSession = {
          ...session,
          isCompleted: true,
        };

        setSession(completedSession);

        // Update localStorage
        saveQuizProgress({
          quizId: session.quizId.toString(),
          score: session.score,
          totalQuestions: session.questions.length,
          answers: session.answers,
          isCompleted: true,
          startedAt: session.startTime,
          completedAt: Date.now(),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to complete session');
        setError(error);
        console.error('Failed to complete quiz session:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  /**
   * Get current question
   */
  const getCurrentQuestion = useCallback((): Question | null => {
    if (!session || session.currentQuestionIndex >= session.questions.length) {
      return null;
    }
    return session.questions[session.currentQuestionIndex];
  }, [session]);

  /**
   * Load saved progress on mount
   */
  useEffect(() => {
    // Could load from localStorage if needed for recovery
  }, []);

  return {
    session,
    isLoading,
    error,
    startSession,
    submitAnswer,
    nextQuestion,
    completeSession,
    getCurrentQuestion,
  };
}

export default useQuizSession;

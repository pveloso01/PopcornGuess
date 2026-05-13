/**
 * Hook for managing quiz session state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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
  target_kind?: 'movie' | 'tv';
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

  // Mirror of session so callbacks can read the *current* value, not
  // a stale closure. Two rapid correct answers used to lose the
  // second increment because both reads saw score=0 from the same
  // captured render.
  const sessionRef = useRef<QuizSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
      const current = sessionRef.current;
      if (!current) return;

      try {
        setError(null);

        const answerData = {
          questionId,
          answer,
          isCorrect,
          attemptsUsed,
        };

        await api.progress.submit(current.progressId, answerData, deviceId);

        // Functional setSession with the latest state — score updates
        // are now race-proof when two correct answers land close
        // together. Reading score from `current` (the ref snapshot at
        // call-time) would have been just as wrong as the closure.
        setSession((prev) => {
          if (!prev) return prev;
          const updated: QuizSession = {
            ...prev,
            answers: [...prev.answers, answerData],
            score: prev.score + (isCorrect ? 1 : 0),
          };
          saveQuizProgress({
            quizId: updated.quizId.toString(),
            score: updated.score,
            totalQuestions: updated.questions.length,
            answers: updated.answers,
            isCompleted: false,
            startedAt: updated.startTime,
          });
          return updated;
        });
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to submit answer');
        setError(error);
        console.error('Failed to submit answer:', error);
      }
    },
    []
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

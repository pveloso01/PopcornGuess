'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getQuizProgress,
  saveQuizProgress,
  QuizProgress,
  getOrCreateDeviceId,
} from '@/lib/storage';

/**
 * useProgress Hook
 *
 * Manages quiz progress state:
 * - Tracks answers and scores
 * - Syncs with localStorage
 * - Handles progress recovery after page refresh
 */

interface Answer {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  attemptsUsed: number;
}

interface UseProgressOptions {
  quizId: string;
  totalQuestions: number;
  autoSave?: boolean;
}

export function useProgress({
  quizId,
  totalQuestions,
  autoSave = true,
}: UseProgressOptions) {
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Initialize progress on mount
  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // Try to load existing progress
    const existingProgress = getQuizProgress(quizId);

    if (existingProgress) {
      setProgress(existingProgress);
    } else {
      // Create new progress
      const newProgress: QuizProgress = {
        quizId,
        score: 0,
        totalQuestions,
        answers: [],
        isCompleted: false,
        startedAt: Date.now(),
      };
      setProgress(newProgress);
    }

    setIsLoaded(true);
  }, [quizId, totalQuestions]);

  // Auto-save progress when it changes
  useEffect(() => {
    if (isLoaded && progress && autoSave) {
      saveQuizProgress(progress);
    }
  }, [progress, isLoaded, autoSave]);

  /**
   * Record an answer for a question
   */
  const recordAnswer = useCallback(
    (answer: Omit<Answer, 'isCorrect'> & { isCorrect?: boolean }) => {
      setProgress((prev) => {
        if (!prev) return prev;

        // Check if we already have an answer for this question
        const existingIndex = prev.answers.findIndex(
          (a) => a.questionId === answer.questionId
        );

        let newAnswers: Answer[];
        if (existingIndex >= 0) {
          // Update existing answer
          newAnswers = [...prev.answers];
          newAnswers[existingIndex] = {
            ...newAnswers[existingIndex],
            ...answer,
            isCorrect: answer.isCorrect ?? newAnswers[existingIndex].isCorrect,
          };
        } else {
          // Add new answer
          newAnswers = [
            ...prev.answers,
            { ...answer, isCorrect: answer.isCorrect ?? false },
          ];
        }

        // Calculate new score
        const newScore = newAnswers.filter((a) => a.isCorrect).length;

        return {
          ...prev,
          answers: newAnswers,
          score: newScore,
        };
      });
    },
    []
  );

  /**
   * Mark quiz as completed
   */
  const completeQuiz = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isCompleted: true,
        completedAt: Date.now(),
      };
    });
  }, []);

  /**
   * Reset progress for this quiz
   */
  const resetProgress = useCallback(() => {
    const newProgress: QuizProgress = {
      quizId,
      score: 0,
      totalQuestions,
      answers: [],
      isCompleted: false,
      startedAt: Date.now(),
    };
    setProgress(newProgress);
    if (autoSave) {
      saveQuizProgress(newProgress);
    }
  }, [quizId, totalQuestions, autoSave]);

  /**
   * Get the answer for a specific question
   */
  const getAnswerForQuestion = useCallback(
    (questionId: number): Answer | null => {
      if (!progress) return null;
      return progress.answers.find((a) => a.questionId === questionId) || null;
    },
    [progress]
  );

  /**
   * Check if a question has been answered
   */
  const isQuestionAnswered = useCallback(
    (questionId: number): boolean => {
      return getAnswerForQuestion(questionId) !== null;
    },
    [getAnswerForQuestion]
  );

  /**
   * Get current question index (based on unanswered questions)
   */
  const getCurrentQuestionIndex = useCallback((): number => {
    if (!progress) return 0;
    return progress.answers.length;
  }, [progress]);

  /**
   * Calculate percentage score
   */
  const getPercentageScore = useCallback((): number => {
    if (!progress || totalQuestions === 0) return 0;
    return Math.round((progress.score / totalQuestions) * 100);
  }, [progress, totalQuestions]);

  /**
   * Check if user achieved a perfect score
   */
  const isPerfectScore = useCallback((): boolean => {
    if (!progress) return false;
    return progress.score === totalQuestions && progress.isCompleted;
  }, [progress, totalQuestions]);

  /**
   * Get time taken in seconds
   */
  const getTimeTaken = useCallback((): number | null => {
    if (!progress) return null;
    const endTime = progress.completedAt || Date.now();
    return Math.floor((endTime - progress.startedAt) / 1000);
  }, [progress]);

  return {
    progress,
    isLoaded,
    deviceId,
    recordAnswer,
    completeQuiz,
    resetProgress,
    getAnswerForQuestion,
    isQuestionAnswered,
    getCurrentQuestionIndex,
    getPercentageScore,
    isPerfectScore,
    getTimeTaken,
  };
}

export default useProgress;




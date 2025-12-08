'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
} from '@/lib/storage';

/**
 * useStreak Hook
 *
 * Manages streak state in localStorage:
 * - Tracks current and best streak
 * - Updates streak based on daily play
 * - Handles streak freeze logic
 */

interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null;
  totalDaysPlayed: number;
  streakFreezesAvailable: number;
}

const DEFAULT_STREAK_STATE: StreakState = {
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  totalDaysPlayed: 0,
  streakFreezesAvailable: 0,
};

export function useStreak() {
  const [streakState, setStreakState] = useState<StreakState>(DEFAULT_STREAK_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load streak from localStorage on mount
  useEffect(() => {
    const savedStreak = getStorageItem(STORAGE_KEYS.STREAK, DEFAULT_STREAK_STATE);
    setStreakState(savedStreak);
    setIsLoaded(true);
  }, []);

  // Save streak to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      setStorageItem(STORAGE_KEYS.STREAK, streakState);
    }
  }, [streakState, isLoaded]);

  /**
   * Get today's date string in YYYY-MM-DD format (UTC)
   */
  const getTodayString = useCallback(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  /**
   * Check if the user has already played today
   */
  const hasPlayedToday = useCallback(() => {
    return streakState.lastPlayedDate === getTodayString();
  }, [streakState.lastPlayedDate, getTodayString]);

  /**
   * Calculate days since last played
   */
  const daysSinceLastPlayed = useCallback(() => {
    if (!streakState.lastPlayedDate) return null;

    const lastPlayed = new Date(streakState.lastPlayedDate);
    const today = new Date(getTodayString());
    const diffTime = today.getTime() - lastPlayed.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }, [streakState.lastPlayedDate, getTodayString]);

  /**
   * Update streak after completing a quiz
   */
  const updateStreak = useCallback(() => {
    const today = getTodayString();
    const daysSince = daysSinceLastPlayed();

    setStreakState((prev) => {
      let newCurrentStreak = prev.currentStreak;
      let newBestStreak = prev.bestStreak;

      if (prev.lastPlayedDate === today) {
        // Already played today, no change
        return prev;
      }

      if (daysSince === null || daysSince === 1) {
        // First time or consecutive day - extend streak
        newCurrentStreak = prev.currentStreak + 1;
        newBestStreak = Math.max(newBestStreak, newCurrentStreak);
      } else if (daysSince === 2 && prev.streakFreezesAvailable > 0) {
        // Missed one day but can use streak freeze
        newCurrentStreak = prev.currentStreak + 1;
        newBestStreak = Math.max(newBestStreak, newCurrentStreak);

        return {
          ...prev,
          currentStreak: newCurrentStreak,
          bestStreak: newBestStreak,
          lastPlayedDate: today,
          totalDaysPlayed: prev.totalDaysPlayed + 1,
          streakFreezesAvailable: prev.streakFreezesAvailable - 1,
        };
      } else if (daysSince !== 0) {
        // Streak broken
        newCurrentStreak = 1;
      }

      return {
        ...prev,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        lastPlayedDate: today,
        totalDaysPlayed: prev.totalDaysPlayed + 1,
      };
    });

    return true;
  }, [getTodayString, daysSinceLastPlayed]);

  /**
   * Add streak freeze tokens
   */
  const addStreakFreeze = useCallback((count: number = 1) => {
    setStreakState((prev) => ({
      ...prev,
      streakFreezesAvailable: prev.streakFreezesAvailable + count,
    }));
  }, []);

  /**
   * Check if streak is at risk (missed yesterday)
   */
  const isStreakAtRisk = useCallback(() => {
    const daysSince = daysSinceLastPlayed();
    return daysSince === 1;
  }, [daysSinceLastPlayed]);

  /**
   * Get streak milestone info
   */
  const getStreakMilestone = useCallback(() => {
    const milestones = [3, 7, 14, 30, 50, 100, 365];
    const { currentStreak } = streakState;

    const reached = milestones.filter((m) => m <= currentStreak);
    const next = milestones.find((m) => m > currentStreak);

    return {
      currentMilestone: reached[reached.length - 1] || 0,
      nextMilestone: next || 365,
      progress: next
        ? ((currentStreak - (reached[reached.length - 1] || 0)) /
            (next - (reached[reached.length - 1] || 0))) *
          100
        : 100,
    };
  }, [streakState]);

  return {
    ...streakState,
    isLoaded,
    hasPlayedToday,
    updateStreak,
    addStreakFreeze,
    isStreakAtRisk,
    getStreakMilestone,
    daysSinceLastPlayed,
  };
}

export default useStreak;




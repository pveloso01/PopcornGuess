/**
 * LocalStorage Utilities
 *
 * Provides localStorage access with:
 * - Device ID generation
 * - Quota exceeded handling
 * - Type-safe getters/setters
 */

const STORAGE_PREFIX = 'popcornguess_';

// Storage keys
export const STORAGE_KEYS = {
  DEVICE_ID: `${STORAGE_PREFIX}device_id`,
  STREAK: `${STORAGE_PREFIX}streak`,
  BEST_STREAK: `${STORAGE_PREFIX}best_streak`,
  LAST_PLAYED: `${STORAGE_PREFIX}last_played`,
  PROGRESS: `${STORAGE_PREFIX}progress`,
  SETTINGS: `${STORAGE_PREFIX}settings`,
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get item from localStorage with type safety
 */
export function getStorageItem<T>(key: StorageKey, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;

  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set item in localStorage with quota handling
 */
export function setStorageItem<T>(key: StorageKey, value: T): boolean {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // Handle quota exceeded
    if (
      error instanceof DOMException &&
      (error.code === 22 ||
        error.code === 1014 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      // Try to clear old data and retry
      clearOldData();
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        console.error('Storage quota exceeded, unable to save');
        return false;
      }
    }
    return false;
  }
}

/**
 * Remove item from localStorage
 */
export function removeStorageItem(key: StorageKey): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(key);
}

/**
 * Clear all PopcornGuess data from localStorage
 */
export function clearAllData(): void {
  if (!isStorageAvailable()) return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Clear old progress data to free up space
 */
function clearOldData(): void {
  // Clear progress data older than 30 days
  const progress = getStorageItem<Record<string, unknown>>(STORAGE_KEYS.PROGRESS, {});
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const filteredProgress: Record<string, unknown> = {};
  Object.entries(progress).forEach(([key, value]) => {
    if (value && typeof value === 'object' && 'timestamp' in value) {
      const timestamp = (value as { timestamp: number }).timestamp;
      if (timestamp > thirtyDaysAgo) {
        filteredProgress[key] = value;
      }
    }
  });

  setStorageItem(STORAGE_KEYS.PROGRESS, filteredProgress);
}

/**
 * Generate a unique device ID
 */
export function generateDeviceId(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create device ID
 */
export function getOrCreateDeviceId(): string {
  let deviceId = getStorageItem<string | null>(STORAGE_KEYS.DEVICE_ID, null);

  if (!deviceId) {
    deviceId = generateDeviceId();
    setStorageItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }

  return deviceId;
}

// User settings interface
export interface UserSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
  timezone: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  notificationsEnabled: false,
  theme: 'dark',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

/**
 * Get user settings
 */
export function getSettings(): UserSettings {
  return getStorageItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

/**
 * Update user settings
 */
export function updateSettings(updates: Partial<UserSettings>): UserSettings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  setStorageItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

// Progress data interface
export interface QuizProgress {
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: number;
    answer: string;
    isCorrect: boolean;
    attemptsUsed: number;
  }>;
  isCompleted: boolean;
  startedAt: number;
  completedAt?: number;
}

/**
 * Get quiz progress
 */
export function getQuizProgress(quizId: string): QuizProgress | null {
  const allProgress = getStorageItem<Record<string, QuizProgress>>(
    STORAGE_KEYS.PROGRESS,
    {}
  );
  return allProgress[quizId] || null;
}

/**
 * Save quiz progress
 */
export function saveQuizProgress(progress: QuizProgress): boolean {
  const allProgress = getStorageItem<Record<string, QuizProgress>>(
    STORAGE_KEYS.PROGRESS,
    {}
  );
  allProgress[progress.quizId] = {
    ...progress,
    timestamp: Date.now(),
  } as QuizProgress;
  return setStorageItem(STORAGE_KEYS.PROGRESS, allProgress);
}


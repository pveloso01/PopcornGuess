/**
 * API client for PopcornGuess backend.
 *
 * NEXT_PUBLIC_API_URL must be set explicitly. Previous versions silently
 * fell back to `http://localhost:8000/api/v1`, which masked real
 * misconfiguration in production and during port reshuffles in dev
 * (the daily-quiz page would surface only a generic "Failed to fetch"
 * with no hint that the env var was wrong). We now log loudly in dev
 * and throw early on the first call when no URL is configured.
 */

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_BASE_URL = (RAW_API_URL ?? '').replace(/\/$/, '');

if (typeof window !== 'undefined' && !RAW_API_URL) {
  // eslint-disable-next-line no-console
  console.error(
    '[api] NEXT_PUBLIC_API_URL is not set. The frontend cannot reach the ' +
      'backend. Set it in .env (dev) or in the Vercel project (prod) and ' +
      'restart the dev server.'
  );
}

/**
 * Surface a clearer error than "Failed to fetch". TypeError on fetch
 * almost always means a network-level miss (DNS, CORS, wrong host).
 */
class ApiNetworkError extends Error {
  constructor(url: string, cause: unknown) {
    const inner = cause instanceof Error ? cause.message : String(cause);
    super(
      `Could not reach the PopcornGuess API at ${url}. ` +
        `Check NEXT_PUBLIC_API_URL and that the backend is healthy. ` +
        `Underlying error: ${inner}`
    );
    this.name = 'ApiNetworkError';
  }
}

interface RequestOptions extends RequestInit {
  deviceId?: string;
}

/**
 * Make an API request with automatic device ID injection.
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not configured. Set it before making API calls.'
    );
  }

  const { deviceId, headers, ...fetchOptions } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (deviceId) {
    requestHeaders['X-Device-ID'] = deviceId;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });
  } catch (cause) {
    // Browser fetch throws TypeError on DNS / CORS / connection refused.
    // Wrap it so callers can present a useful message and downstream
    // observability (Sentry) can group these accurately.
    throw new ApiNetworkError(url, cause);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export { ApiNetworkError };

/**
 * API client methods
 */
export const api = {
  // Anonymous user endpoints
  anonymous: {
    register: async (data?: { timezone_name?: string; notifications_enabled?: boolean }) => {
      return apiRequest('/anonymous/register/', {
        method: 'POST',
        body: JSON.stringify(data || {}),
      });
    },

    sync: async (
      deviceId: string,
      data?: {
        progress_data?: unknown;
        streak_data?: unknown;
        stats_data?: unknown;
      }
    ) => {
      return apiRequest('/anonymous/sync/', {
        method: 'POST',
        deviceId,
        body: JSON.stringify({
          device_id: deviceId,
          ...data,
        }),
      });
    },
  },

  // Streak endpoints
  streaks: {
    getCurrent: async (deviceId?: string) => {
      return apiRequest('/streaks/current/', {
        method: 'GET',
        deviceId,
      });
    },

    update: async (deviceId?: string) => {
      return apiRequest('/streaks/update/', {
        method: 'POST',
        deviceId,
      });
    },
  },

  // Stats endpoints
  stats: {
    getMe: async (deviceId?: string) => {
      return apiRequest('/stats/me/', {
        method: 'GET',
        deviceId,
      });
    },
  },

  // Analytics endpoints
  analytics: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitProgress: async (data: any, deviceId?: string) => {
      return apiRequest('/analytics/progress/submit/', {
        method: 'POST',
        deviceId,
        body: JSON.stringify(data),
      });
    },
    getStreak: async (deviceId?: string) => {
      return apiRequest('/analytics/streaks/me/', {
        method: 'GET',
        deviceId,
      });
    },
    getStats: async (deviceId?: string) => {
      return apiRequest('/analytics/stats/me/', {
        method: 'GET',
        deviceId,
      });
    },
    getLeaderboard: async (deviceId?: string, type: string = 'global') => {
      return apiRequest(`/analytics/leaderboard/?type=${type}`, {
        method: 'GET',
        deviceId,
      });
    },
  },

  // Progress endpoints
  progress: {
    start: async (quizId: number, deviceId?: string) => {
      return apiRequest('/progress/start/', {
        method: 'POST',
        deviceId,
        body: JSON.stringify({ quiz_id: quizId }),
      });
    },

    submit: async (
      progressId: number,
      answer: {
        questionId: number;
        answer: string;
        isCorrect: boolean;
        attemptsUsed: number;
      },
      deviceId?: string
    ) => {
      return apiRequest('/progress/submit/', {
        method: 'POST',
        deviceId,
        body: JSON.stringify({
          progress_id: progressId,
          answer,
        }),
      });
    },

    complete: async (progressId: number, timeTakenSeconds: number, deviceId?: string) => {
      return apiRequest('/progress/complete/', {
        method: 'POST',
        deviceId,
        body: JSON.stringify({
          progress_id: progressId,
          time_taken_seconds: timeTakenSeconds,
        }),
      });
    },
  },

  // Quiz endpoints
  quizzes: {
    getDaily: async (deviceId?: string) => {
      return apiRequest('/quizzes/daily/', {
        method: 'GET',
        deviceId,
      });
    },

    getBlitz: async (deviceId?: string) => {
      return apiRequest('/quizzes/blitz/start/', {
        method: 'GET',
        deviceId,
      });
    },

    getPractice: async (
      deviceId?: string,
      options?: { count?: number; category?: string; difficulty?: string }
    ) => {
      const params = new URLSearchParams();
      if (options?.count) params.append('count', options.count.toString());
      if (options?.category) params.append('category', options.category);
      if (options?.difficulty) params.append('difficulty', options.difficulty);

      return apiRequest(`/quizzes/practice/random/?${params.toString()}`, {
        method: 'GET',
        deviceId,
      });
    },

    submitAnswer: async (
      data: {
        quiz_id: number;
        question_id: number;
        answer: string;
        attempt_number: number;
      },
      deviceId?: string
    ) => {
      return apiRequest('/quizzes/submit/', {
        method: 'POST',
        deviceId,
        body: JSON.stringify(data),
      });
    },

    getResults: async (
      quizId: number,
      deviceId?: string,
      progressId?: number
    ) => {
      const qs = progressId !== undefined ? `?progress_id=${progressId}` : '';
      return apiRequest(`/quizzes/results/${quizId}/${qs}`, {
        method: 'GET',
        deviceId,
      });
    },

    autocompleteTitles: async (
      query: string,
      limit: number = 8,
      kind?: 'movie' | 'tv' | 'any'
    ): Promise<TitleAutocompleteResponse> => {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      if (kind === 'movie' || kind === 'tv') {
        params.set('kind', kind);
      }
      return apiRequest<TitleAutocompleteResponse>(
        `/quizzes/titles/?${params.toString()}`,
        { method: 'GET' }
      );
    },
  },
};

export interface TitleSuggestion {
  id: number;
  title: string;
  year: number | null;
  kind: 'movie' | 'tv';
}

export interface TitleAutocompleteResponse {
  results: TitleSuggestion[];
}

export default api;

'use client';

/**
 * Auth context — talks to dj-rest-auth at /api/v1/auth/.
 *
 * JWT lives in an httpOnly cookie set by the backend, so client code
 * never touches the token directly. Every request uses
 * `credentials: 'include'` and the cookie rides along automatically.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface User {
  id: number;
  username: string;
  email: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  refresh: () => Promise<void>;
}

// A non-undefined default lets useContext succeed during Next 16's
// static prerender of /_global-error (an undefined default causes
// "Cannot read properties of null (reading 'useContext')" because Next
// inlines the layout's client chunk during error-boundary prerender).
// The provider always overwrites this; consumers outside the provider
// hit the explicit throw below.
const AUTH_NOT_READY: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {
    throw new Error('AuthProvider not mounted');
  },
  logout: async () => {
    throw new Error('AuthProvider not mounted');
  },
  register: async () => {
    throw new Error('AuthProvider not mounted');
  },
  refresh: async () => {
    throw new Error('AuthProvider not mounted');
  },
};

const AuthContext = createContext<AuthContextType>(AUTH_NOT_READY);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function authFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body === 'object' && body !== null) {
      const detail =
        (body as { detail?: string; non_field_errors?: string[] }).detail;
      if (detail) return detail;
      const fieldErrors = Object.entries(
        body as Record<string, string[] | string>
      )
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(' | ');
      if (fieldErrors) return fieldErrors;
    }
  } catch {
    /* fallthrough */
  }
  return `HTTP ${res.status}`;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const res = await authFetch('/auth/user/');
    if (res.ok) {
      const data = (await res.json()) as User;
      setUser(data);
    } else {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await authFetch('/auth/token/refresh/', { method: 'POST' });
    if (!res.ok) {
      setUser(null);
      throw new Error(await parseError(res));
    }
    await fetchMe();
  }, [fetchMe]);

  // On mount, attempt to hydrate the session from the cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/auth/user/');
        if (!cancelled) {
          if (res.ok) {
            const data = (await res.json()) as User;
            setUser(data);
          } else if (res.status === 401) {
            // Try a silent refresh in case access token expired.
            try {
              await refresh();
            } catch {
              setUser(null);
            }
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const migrateAnonymous = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const deviceId = window.localStorage.getItem('popcornguess_device_id');
    if (!deviceId) return;
    try {
      await authFetch('/anonymous/migrate/', {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId }),
      });
    } catch {
      // Migration failure is non-fatal — surface in next stats sync.
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      await fetchMe();
      await migrateAnonymous();
    },
    [fetchMe, migrateAnonymous]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await authFetch('/auth/registration/', {
        method: 'POST',
        body: JSON.stringify({
          username: payload.username,
          email: payload.email,
          password1: payload.password,
          password2: payload.password_confirm,
        }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      await fetchMe();
      await migrateAnonymous();
    },
    [fetchMe, migrateAnonymous]
  );

  const logout = useCallback(async () => {
    await authFetch('/auth/logout/', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      register,
      refresh,
    }),
    [user, isLoading, login, logout, register, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === AUTH_NOT_READY) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

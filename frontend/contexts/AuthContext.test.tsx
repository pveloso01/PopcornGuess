import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

let fetchCalls: FetchCall[];
let fetchMock: jest.Mock;

function setupFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  fetchCalls = [];
  fetchMock = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const call: FetchCall = { url: String(url), init };
    fetchCalls.push(call);
    return handler(call);
  });
  (global as unknown as { fetch: typeof fetch }).fetch =
    fetchMock as unknown as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function Probe(): React.JSX.Element {
  const { user, isLoading, isAuthenticated, login, logout, register } =
    useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth">{isAuthenticated ? 'in' : 'out'}</div>
      <div data-testid="email">{user?.email ?? 'none'}</div>
      <button
        type="button"
        onClick={() => {
          login('a@b.com', 'pw').catch(() => {});
        }}
      >
        login
      </button>
      <button
        type="button"
        onClick={() => {
          register({
            username: 'x',
            email: 'a@b.com',
            password: 'pwpwpwpw',
            password_confirm: 'pwpwpwpw',
          }).catch(() => {});
        }}
      >
        register
      </button>
      <button
        type="button"
        onClick={() => {
          logout().catch(() => {});
        }}
      >
        logout
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('AuthContext', () => {
  it('hydrates with anonymous user when /auth/user/ returns 401 and refresh fails', async () => {
    setupFetch((call) => {
      if (call.url.endsWith('/auth/user/')) {
        return jsonResponse(401, { detail: 'no session' });
      }
      if (call.url.endsWith('/auth/token/refresh/')) {
        return jsonResponse(401, { detail: 'no refresh' });
      }
      return jsonResponse(404, {});
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    );
    expect(screen.getByTestId('auth')).toHaveTextContent('out');
  });

  it('login posts to /auth/login/, fetches user, and migrates anonymous progress', async () => {
    window.localStorage.setItem(
      'popcornguess_device_id',
      'device-from-anon'
    );

    setupFetch((call) => {
      if (call.url.endsWith('/auth/login/')) {
        return jsonResponse(200, {});
      }
      if (call.url.endsWith('/auth/user/')) {
        return jsonResponse(200, {
          id: 1,
          username: 'pedro',
          email: 'a@b.com',
        });
      }
      if (call.url.endsWith('/anonymous/migrate/')) {
        return jsonResponse(200, { status: 'migrated' });
      }
      if (call.url.endsWith('/auth/token/refresh/')) {
        return jsonResponse(401, {});
      }
      return jsonResponse(404, {});
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    );

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('email')).toHaveTextContent('a@b.com')
    );

    const urls = fetchCalls.map((c) => c.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/auth/login/'),
        expect.stringContaining('/auth/user/'),
        expect.stringContaining('/anonymous/migrate/'),
      ])
    );
  });

  it('register maps password_confirm → password2 in payload', async () => {
    setupFetch((call) => {
      if (call.url.endsWith('/auth/registration/')) {
        return jsonResponse(201, {});
      }
      if (call.url.endsWith('/auth/user/')) {
        return jsonResponse(200, {
          id: 1,
          username: 'x',
          email: 'a@b.com',
        });
      }
      return jsonResponse(401, {});
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    );

    await act(async () => {
      screen.getByText('register').click();
    });

    const registerCall = fetchCalls.find((c) =>
      c.url.endsWith('/auth/registration/')
    );
    expect(registerCall).toBeDefined();
    const body = JSON.parse(String(registerCall!.init!.body));
    expect(body).toMatchObject({
      username: 'x',
      email: 'a@b.com',
      password1: 'pwpwpwpw',
      password2: 'pwpwpwpw',
    });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('password_confirm');
  });

  it('logout posts to /auth/logout/ and clears the user', async () => {
    setupFetch((call) => {
      if (call.url.endsWith('/auth/logout/')) {
        return jsonResponse(200, {});
      }
      if (call.url.endsWith('/auth/user/')) {
        return jsonResponse(200, {
          id: 1,
          username: 'pedro',
          email: 'a@b.com',
        });
      }
      return jsonResponse(404, {});
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('email')).toHaveTextContent('a@b.com')
    );

    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('email')).toHaveTextContent('none')
    );
  });

  it('throws Error with detail on login failure', async () => {
    setupFetch(() =>
      jsonResponse(400, { detail: 'Wrong password.' })
    );
    let thrown: unknown = null;
    function Caller(): React.JSX.Element {
      const { login } = useAuth();
      return (
        <button
          type="button"
          onClick={async () => {
            try {
              await login('a@b.com', 'pw');
            } catch (e) {
              thrown = e;
            }
          }}
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <Caller />
      </AuthProvider>
    );
    await waitFor(() => expect(fetchCalls.length).toBeGreaterThan(0));
    await act(async () => {
      screen.getByText('go').click();
    });
    await waitFor(() => expect(thrown).not.toBeNull());
    expect((thrown as Error).message).toBe('Wrong password.');
  });

  it('parses field errors when no detail is present', async () => {
    setupFetch(() =>
      jsonResponse(400, { email: ['Invalid email.'], password: ['Too short.'] })
    );
    let thrown: unknown = null;
    function Caller(): React.JSX.Element {
      const { login } = useAuth();
      return (
        <button
          type="button"
          onClick={async () => {
            try {
              await login('bad', 'short');
            } catch (e) {
              thrown = e;
            }
          }}
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <Caller />
      </AuthProvider>
    );
    await waitFor(() => expect(fetchCalls.length).toBeGreaterThan(0));
    await act(async () => {
      screen.getByText('go').click();
    });
    await waitFor(() => expect(thrown).not.toBeNull());
    expect((thrown as Error).message).toContain('email');
    expect((thrown as Error).message).toContain('password');
  });
});

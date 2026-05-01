/**
 * Tests for the API client. We mock global fetch — the client is thin,
 * so the tests pin its contract: header injection, URL construction,
 * error parsing.
 */

import { api } from './api';

describe('api client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function ok(body: unknown) {
    return {
      ok: true,
      json: () => Promise.resolve(body),
    } as unknown as Response;
  }

  function notOk(status: number, body: unknown) {
    return {
      ok: false,
      status,
      json: () => Promise.resolve(body),
    } as unknown as Response;
  }

  describe('anonymous.register', () => {
    it('POSTs to /anonymous/register/ with body', async () => {
      fetchMock.mockResolvedValue(ok({ device_id: 'd' }));
      await api.anonymous.register({ timezone_name: 'UTC' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/anonymous/register/');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body)).toEqual({ timezone_name: 'UTC' });
    });
  });

  describe('quizzes.getDaily', () => {
    it('injects X-Device-ID when provided', async () => {
      fetchMock.mockResolvedValue(ok({ id: 1 }));
      await api.quizzes.getDaily('device-abc');
      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['X-Device-ID']).toBe('device-abc');
    });

    it('omits X-Device-ID when not provided', async () => {
      fetchMock.mockResolvedValue(ok({ id: 1 }));
      await api.quizzes.getDaily();
      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['X-Device-ID']).toBeUndefined();
    });
  });

  describe('quizzes.autocompleteTitles', () => {
    it('builds q + limit query string', async () => {
      fetchMock.mockResolvedValue(ok({ results: [] }));
      await api.quizzes.autocompleteTitles('matrix', 5);
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/quizzes\/titles\/\?.*q=matrix/);
      expect(String(url)).toMatch(/limit=5/);
    });

    it('returns the parsed response', async () => {
      fetchMock.mockResolvedValue(
        ok({ results: [{ id: 1, title: 'X', year: 2020, kind: 'movie' }] })
      );
      const result = await api.quizzes.autocompleteTitles('x');
      expect(result.results[0].title).toBe('X');
    });
  });

  describe('error handling', () => {
    it('throws Error with detail from response body', async () => {
      fetchMock.mockResolvedValue(notOk(400, { detail: 'bad input' }));
      await expect(api.quizzes.getDaily()).rejects.toThrow('bad input');
    });

    it('falls back to a generic message when body is unparseable', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });
      // The current client uses "Request failed" as the unparseable fallback.
      await expect(api.quizzes.getDaily()).rejects.toThrow('Request failed');
    });
  });

  describe('quizzes.submitAnswer', () => {
    it('POSTs payload with deviceId', async () => {
      fetchMock.mockResolvedValue(ok({ is_correct: true }));
      await api.quizzes.submitAnswer(
        { quiz_id: 1, question_id: 2, answer: 'x', attempt_number: 1 },
        'device-1'
      );
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/quizzes/submit/');
      expect(init.headers['X-Device-ID']).toBe('device-1');
      expect(JSON.parse(init.body)).toMatchObject({ quiz_id: 1 });
    });
  });

  describe('anonymous endpoints', () => {
    it('register POSTs to /anonymous/register/', async () => {
      fetchMock.mockResolvedValue(ok({ device_id: 'd' }));
      await api.anonymous.register({
        timezone_name: 'UTC',
        notifications_enabled: false,
      });
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/anonymous/register/');
      expect(init.method).toBe('POST');
    });

    it('sync POSTs device_id', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.anonymous.sync('device-9');
      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({ device_id: 'device-9' });
    });
  });

  describe('streaks endpoints', () => {
    it('getCurrent injects device id', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.streaks.getCurrent('device-x');
      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['X-Device-ID']).toBe('device-x');
    });

    it('update POSTs', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.streaks.update('device-x');
      const [, init] = fetchMock.mock.calls[0];
      expect(init.method).toBe('POST');
    });
  });

  describe('stats and progress endpoints', () => {
    it('stats.getMe GETs', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.stats.getMe('device-x');
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/stats/me/');
      expect(init.method).toBe('GET');
    });

    it('progress.start POSTs quiz_id', async () => {
      fetchMock.mockResolvedValue(ok({ id: 1 }));
      await api.progress.start(42, 'device-x');
      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toMatchObject({ quiz_id: 42 });
    });

    it('progress.submit POSTs progress_id and answer', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.progress.submit(99, {
        questionId: 1,
        answer: 'x',
        isCorrect: true,
        attemptsUsed: 1,
      });
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/progress/submit/');
      expect(JSON.parse(init.body)).toMatchObject({ progress_id: 99 });
    });

    it('progress.complete POSTs', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.progress.complete(99, 30);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/progress/complete/');
      expect(JSON.parse(init.body)).toMatchObject({
        progress_id: 99,
        time_taken_seconds: 30,
      });
    });
  });

  describe('analytics endpoints', () => {
    it('submitProgress POSTs', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.analytics.submitProgress({ foo: 'bar' });
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/analytics/progress/submit/');
    });

    it('getLeaderboard appends type to URL', async () => {
      fetchMock.mockResolvedValue(ok({ results: [] }));
      await api.analytics.getLeaderboard('device-x', 'weekly');
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/analytics/leaderboard/?type=weekly');
    });

    it('getLeaderboard defaults to global', async () => {
      fetchMock.mockResolvedValue(ok({ results: [] }));
      await api.analytics.getLeaderboard();
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('type=global');
    });

    it('getStreak and getStats hit their endpoints', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.analytics.getStreak();
      await api.analytics.getStats();
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('/analytics/streaks/me/'))).toBe(true);
      expect(urls.some((u) => u.includes('/analytics/stats/me/'))).toBe(true);
    });
  });

  describe('quizzes.getBlitz and getPractice', () => {
    it('getBlitz hits /quizzes/blitz/start/', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.quizzes.getBlitz('device-x');
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/quizzes/blitz/start/');
    });

    it('getPractice forwards count + difficulty', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.quizzes.getPractice('device-x', {
        count: 5,
        difficulty: 'hard',
      });
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('count=5');
      expect(String(url)).toContain('difficulty=hard');
    });

    it('getResults builds the URL with quiz id', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await api.quizzes.getResults(7, 'device-x');
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/quizzes/results/7/');
    });
  });
});

import { act, renderHook } from '@testing-library/react';
import { useStreak } from './useStreak';

jest.mock('@/lib/storage', () => {
  const store: Record<string, unknown> = {};
  return {
    STORAGE_KEYS: { STREAK: 'streak-key' },
    getStorageItem: (key: string, fallback: unknown) =>
      store[key] === undefined ? fallback : store[key],
    setStorageItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    __reset: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
});

const storage = jest.requireMock('@/lib/storage') as {
  __reset: () => void;
};

beforeEach(() => {
  storage.__reset();
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
});

afterEach(() => {
  jest.useRealTimers();
});

function setToday(iso: string): void {
  jest.setSystemTime(new Date(`${iso}T12:00:00Z`));
}

describe('useStreak', () => {
  it('hydrates from storage on mount', async () => {
    const { result, rerender } = renderHook(() => useStreak());
    // Allow effect to fire.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.bestStreak).toBe(0);
  });

  it('first updateStreak sets streak to 1', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.bestStreak).toBe(1);
  });

  it('consecutive day increments and grows best streak', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });

    setToday('2026-05-02');
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.currentStreak).toBe(2);
    expect(result.current.bestStreak).toBe(2);
  });

  it('skipping a day with a freeze burns the freeze and keeps the streak', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.addStreakFreeze(1);
      result.current.updateStreak();
    });

    setToday('2026-05-03');
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.currentStreak).toBe(2);
    expect(result.current.streakFreezesAvailable).toBe(0);
  });

  it('skipping with no freezes resets streak to 1', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });

    setToday('2026-05-05');
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.currentStreak).toBe(1);
  });

  it('same-day update is idempotent', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.currentStreak).toBe(1);
  });

  it('hasPlayedToday tracks the daily flag', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.hasPlayedToday()).toBe(false);
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.hasPlayedToday()).toBe(true);
  });

  it('milestone calculations land on the right boundary', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });
    const m = result.current.getStreakMilestone();
    expect(m.nextMilestone).toBe(3);
    expect(m.currentMilestone).toBe(0);
  });
});

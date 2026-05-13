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

  it('isStreakAtRisk is true when one day has passed since last played', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });
    // One day later — streak at risk but not yet broken.
    setToday('2026-05-02');
    expect(result.current.isStreakAtRisk()).toBe(true);
  });

  it('isStreakAtRisk is false on the same day', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.isStreakAtRisk()).toBe(false);
  });

  it('daysSinceLastPlayed returns null when never played', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.daysSinceLastPlayed()).toBeNull();
  });

  it('skipping 2 days with no freeze resets streak to 1', async () => {
    setToday('2026-05-01');
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.updateStreak();
    });
    // No freeze; 2 days later the daysSince === 2 path falls through and
    // the else branch resets streak to 1.
    setToday('2026-05-03');
    await act(async () => {
      result.current.updateStreak();
    });
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.bestStreak).toBe(1);
  });

  it('addStreakFreeze defaults to +1 when no arg is given', async () => {
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.addStreakFreeze();
    });
    expect(result.current.streakFreezesAvailable).toBe(1);
  });

  it('milestone calculates progress fraction between boundaries', async () => {
    const seeded = {
      currentStreak: 5,
      bestStreak: 5,
      lastPlayedDate: '2026-04-30',
      totalDaysPlayed: 5,
      streakFreezesAvailable: 0,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mock = jest.requireMock('@/lib/storage') as any;
    mock.setStorageItem('streak-key', seeded);
    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    const m = result.current.getStreakMilestone();
    // 5 → reached [3], next 7. Progress (5-3)/(7-3) = 50%.
    expect(m.currentMilestone).toBe(3);
    expect(m.nextMilestone).toBe(7);
    expect(m.progress).toBe(50);
  });

  it('milestone returns the boundary itself when currentStreak matches exactly', async () => {
    // Seed storage so the hook hydrates at currentStreak=7 (exactly on
    // the second milestone boundary).
    const seeded = {
      currentStreak: 7,
      bestStreak: 7,
      lastPlayedDate: '2026-04-30',
      totalDaysPlayed: 7,
      streakFreezesAvailable: 0,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mock = jest.requireMock('@/lib/storage') as any;
    mock.setStorageItem('streak-key', seeded);

    const { result } = renderHook(() => useStreak());
    await act(async () => {
      await Promise.resolve();
    });
    const m = result.current.getStreakMilestone();
    // 7 is in the milestones list → reached includes 7 → currentMilestone=7,
    // next boundary is 14.
    expect(m.currentMilestone).toBe(7);
    expect(m.nextMilestone).toBe(14);
  });
});

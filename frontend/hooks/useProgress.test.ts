import { act, renderHook } from '@testing-library/react';
import { useProgress } from './useProgress';

jest.mock('@/lib/storage', () => {
  const cache: Record<string, unknown> = {};
  return {
    __esModule: true,
    getOrCreateDeviceId: jest.fn(() => 'device-test'),
    getQuizProgress: jest.fn(
      (quizId: string) => cache[`quiz:${quizId}`] ?? null
    ),
    saveQuizProgress: jest.fn((p: { quizId: string }) => {
      cache[`quiz:${p.quizId}`] = p;
    }),
    __reset: () => {
      for (const k of Object.keys(cache)) delete cache[k];
    },
  };
});

const storage = jest.requireMock('@/lib/storage') as { __reset: () => void };

beforeEach(() => {
  storage.__reset();
});

describe('useProgress', () => {
  it('initialises an empty session for an unknown quiz', () => {
    const { result } = renderHook(() =>
      useProgress({ quizId: 'q-1', totalQuestions: 5 })
    );
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.progress?.score).toBe(0);
    expect(result.current.progress?.answers).toEqual([]);
    expect(result.current.deviceId).toBe('device-test');
  });

  it('records an answer and recalculates score', () => {
    const { result } = renderHook(() =>
      useProgress({ quizId: 'q-1', totalQuestions: 3 })
    );
    act(() => {
      result.current.recordAnswer({
        questionId: 1,
        answer: 'foo',
        attemptsUsed: 1,
        isCorrect: true,
      });
    });
    expect(result.current.progress?.score).toBe(1);
    expect(result.current.getAnswerForQuestion(1)?.isCorrect).toBe(true);
    expect(result.current.isQuestionAnswered(1)).toBe(true);
  });

  it('updates an existing answer rather than duplicating', () => {
    const { result } = renderHook(() =>
      useProgress({ quizId: 'q-1', totalQuestions: 3 })
    );
    act(() => {
      result.current.recordAnswer({
        questionId: 1,
        answer: 'foo',
        attemptsUsed: 1,
        isCorrect: false,
      });
    });
    act(() => {
      result.current.recordAnswer({
        questionId: 1,
        answer: 'foo-corrected',
        attemptsUsed: 2,
        isCorrect: true,
      });
    });
    expect(result.current.progress?.answers).toHaveLength(1);
    expect(result.current.progress?.score).toBe(1);
  });

  it('completeQuiz sets isCompleted', () => {
    const { result } = renderHook(() =>
      useProgress({ quizId: 'q-1', totalQuestions: 1 })
    );
    act(() => {
      result.current.completeQuiz();
    });
    expect(result.current.progress?.isCompleted).toBe(true);
  });

  it('getPercentageScore reports the right ratio', () => {
    const { result } = renderHook(() =>
      useProgress({ quizId: 'q-1', totalQuestions: 4 })
    );
    act(() => {
      result.current.recordAnswer({
        questionId: 1,
        answer: 'a',
        attemptsUsed: 1,
        isCorrect: true,
      });
      result.current.recordAnswer({
        questionId: 2,
        answer: 'b',
        attemptsUsed: 1,
        isCorrect: true,
      });
    });
    expect(result.current.getPercentageScore()).toBe(50);
  });

  it('isPerfectScore is true when score equals total and quiz is complete', () => {
    const { result } = renderHook(() =>
      useProgress({ quizId: 'q-1', totalQuestions: 1 })
    );
    act(() => {
      result.current.recordAnswer({
        questionId: 1,
        answer: 'a',
        attemptsUsed: 1,
        isCorrect: true,
      });
      result.current.completeQuiz();
    });
    expect(result.current.isPerfectScore()).toBe(true);
  });

  it('resetProgress clears answers', () => {
    const { result } = renderHook(() =>
      useProgress({ quizId: 'q-1', totalQuestions: 2 })
    );
    act(() => {
      result.current.recordAnswer({
        questionId: 1,
        answer: 'a',
        attemptsUsed: 1,
        isCorrect: true,
      });
    });
    act(() => {
      result.current.resetProgress();
    });
    expect(result.current.progress?.answers).toEqual([]);
    expect(result.current.progress?.score).toBe(0);
  });
});

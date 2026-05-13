import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuizSession } from './useQuizSession';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    progress: {
      start: jest.fn(),
      submit: jest.fn(),
      complete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/storage', () => ({
  __esModule: true,
  saveQuizProgress: jest.fn(),
}));

import api from '@/lib/api';

const startMock = api.progress.start as jest.Mock;
const submitMock = api.progress.submit as jest.Mock;
const completeMock = api.progress.complete as jest.Mock;

const QUESTIONS = [
  { id: 1, question_type: 'text', text: 'q1' },
  { id: 2, question_type: 'text', text: 'q2' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useQuizSession', () => {
  it('startSession initialises state with quiz info and progressId', async () => {
    startMock.mockResolvedValue({ id: 99 });
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS, 'device-1');
    });
    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(result.current.session?.progressId).toBe(99);
    expect(result.current.session?.quizId).toBe(42);
    expect(result.current.session?.questions).toHaveLength(2);
    expect(result.current.session?.score).toBe(0);
  });

  it('submitAnswer increments score on correct answer', async () => {
    startMock.mockResolvedValue({ id: 99 });
    submitMock.mockResolvedValue({});
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    await act(async () => {
      await result.current.submitAnswer(1, 'foo', true, 1);
    });
    expect(result.current.session?.score).toBe(1);
    expect(result.current.session?.answers).toHaveLength(1);
  });

  it('submitAnswer keeps score on wrong answer', async () => {
    startMock.mockResolvedValue({ id: 99 });
    submitMock.mockResolvedValue({});
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    await act(async () => {
      await result.current.submitAnswer(1, 'wrong', false, 1);
    });
    expect(result.current.session?.score).toBe(0);
    expect(result.current.session?.answers).toHaveLength(1);
  });

  it('nextQuestion advances index and getCurrentQuestion follows', async () => {
    startMock.mockResolvedValue({ id: 99 });
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    expect(result.current.getCurrentQuestion()?.id).toBe(1);
    act(() => {
      result.current.nextQuestion();
    });
    expect(result.current.session?.currentQuestionIndex).toBe(1);
    expect(result.current.getCurrentQuestion()?.id).toBe(2);
  });

  it('completeSession marks the session complete and calls the API', async () => {
    startMock.mockResolvedValue({ id: 99 });
    completeMock.mockResolvedValue({});
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    await act(async () => {
      await result.current.completeSession('device-x');
    });
    expect(result.current.session?.isCompleted).toBe(true);
    expect(completeMock).toHaveBeenCalled();
  });

  it('startSession catches API rejection and leaves session null', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    startMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS, 'device-1');
    });
    expect(result.current.session).toBeNull();
    expect(result.current.error?.message).toBe('boom');
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('wraps a non-Error rejection in a fresh Error on startSession', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    startMock.mockRejectedValue('non-error-string');
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    expect(result.current.error?.message).toBe('Failed to start session');
    errSpy.mockRestore();
  });

  it('wraps a non-Error rejection on submitAnswer', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    startMock.mockResolvedValue({ id: 1 });
    submitMock.mockRejectedValue('boom-string');
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(1, QUESTIONS);
    });
    await act(async () => {
      await result.current.submitAnswer(1, 'x', true, 1);
    });
    expect(result.current.error?.message).toBe('Failed to submit answer');
    errSpy.mockRestore();
  });

  it('wraps a non-Error rejection on completeSession', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    startMock.mockResolvedValue({ id: 1 });
    completeMock.mockRejectedValue('boom-string');
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(1, QUESTIONS);
    });
    await act(async () => {
      await result.current.completeSession();
    });
    expect(result.current.error?.message).toBe('Failed to complete session');
    errSpy.mockRestore();
  });

  it('submitAnswer records error when api.progress.submit rejects', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    startMock.mockResolvedValue({ id: 99 });
    submitMock.mockRejectedValue(new Error('submit-fail'));
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    await act(async () => {
      await result.current.submitAnswer(1, 'foo', true, 1);
    });
    // Answer is NOT applied to session.answers because the submit threw
    // before the local state update. We just need the error path covered.
    expect(result.current.error?.message).toBe('submit-fail');
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('completeSession is a no-op when no session has been started', async () => {
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.completeSession('device-x');
    });
    expect(completeMock).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
  });

  it('completeSession catches API rejection and surfaces error', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    startMock.mockResolvedValue({ id: 99 });
    completeMock.mockRejectedValue(new Error('complete-fail'));
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    await act(async () => {
      await result.current.completeSession();
    });
    expect(result.current.error?.message).toBe('complete-fail');
    errSpy.mockRestore();
  });

  it('submitAnswer is a no-op when no session has been started', async () => {
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.submitAnswer(1, 'foo', true, 1);
    });
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('nextQuestion is a no-op when no session', () => {
    const { result } = renderHook(() => useQuizSession());
    act(() => {
      result.current.nextQuestion();
    });
    expect(result.current.session).toBeNull();
  });

  it('getCurrentQuestion returns null when no session is started', () => {
    const { result } = renderHook(() => useQuizSession());
    expect(result.current.getCurrentQuestion()).toBeNull();
  });

  it('getCurrentQuestion returns null past the last index', async () => {
    startMock.mockResolvedValue({ id: 99 });
    const { result } = renderHook(() => useQuizSession());
    await act(async () => {
      await result.current.startSession(42, QUESTIONS);
    });
    act(() => {
      result.current.nextQuestion();
    });
    act(() => {
      result.current.nextQuestion();
    });
    // Index now 2, length 2 → null.
    expect(result.current.getCurrentQuestion()).toBeNull();
  });
});

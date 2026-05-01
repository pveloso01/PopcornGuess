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
});

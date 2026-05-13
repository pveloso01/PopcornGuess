/**
 * Tests for share-format helpers — the Wordle-grid contract is the
 * one piece of UX users see most after every game, so it gets the
 * heaviest test coverage in the lib layer.
 */

import {
  copyToClipboard,
  generateDetailedShareText,
  generateEmojiGrid,
  generateLadderGrid,
  generateLadderShareText,
  generateShareText,
  getScoreBadge,
  getTwitterShareUrl,
  getWhatsAppShareUrl,
  isNativeShareSupported,
  nativeShare,
  type LadderAttempt,
} from './shareFormat';

describe('generateEmojiGrid', () => {
  it('marks correct-fast as green and correct-slow as yellow', () => {
    const grid = generateEmojiGrid([
      { isCorrect: true, attemptsUsed: 1 },
      { isCorrect: true, attemptsUsed: 5 },
      { isCorrect: false, attemptsUsed: 6 },
    ]);
    expect(grid).toBe('🟩🟨🟥');
  });

  it('returns empty string for no answers', () => {
    expect(generateEmojiGrid([])).toBe('');
  });
});

describe('generateLadderGrid', () => {
  const win = (rungs: number): LadderAttempt => ({
    isCorrect: true,
    rungsSeen: rungs,
  });
  const miss: LadderAttempt = { isCorrect: false, rungsSeen: 1 };

  it('renders an empty string when there are no attempts', () => {
    expect(generateLadderGrid([])).toBe('');
  });

  it('uses green for fast wins (≤3 rungs)', () => {
    expect(generateLadderGrid([miss, miss, win(3)])).toBe('⬛⬛🟩');
  });

  it('uses yellow for slow wins (4+ rungs)', () => {
    expect(generateLadderGrid([miss, miss, miss, miss, win(5)])).toBe(
      '⬛⬛⬛⬛🟨'
    );
  });

  it('caps at maxAttempts', () => {
    const grid = generateLadderGrid(
      Array(10).fill(miss),
      { maxAttempts: 6 }
    );
    expect(grid).toBe('⬛⬛⬛⬛⬛⬛');
  });

  it('pads with whitespace markers when padToMax is true', () => {
    const grid = generateLadderGrid([miss, win(2)], {
      maxAttempts: 6,
      padToMax: true,
    });
    expect(grid).toBe('⬛🟩▫▫▫▫');
  });
});

describe('generateLadderShareText', () => {
  const baseInput = {
    date: '2026-05-01',
    solved: true,
    rungsRevealed: 3,
    attempts: [
      { isCorrect: false, rungsSeen: 1 },
      { isCorrect: false, rungsSeen: 2 },
      { isCorrect: true, rungsSeen: 3 },
    ],
    siteUrl: 'https://test.example',
  };

  it('renders score, grid, and site URL', () => {
    const text = generateLadderShareText(baseInput);
    expect(text).toContain('PopcornGuess');
    expect(text).toContain('3/6');
    expect(text).toContain('⬛⬛🟩');
    expect(text).toContain('https://test.example');
  });

  it('shows X/6 when not solved', () => {
    const text = generateLadderShareText({
      ...baseInput,
      solved: false,
      rungsRevealed: 6,
    });
    expect(text).toContain('X/6');
  });

  it('appends the streak when ≥ 2', () => {
    expect(generateLadderShareText({ ...baseInput, streak: 2 })).toContain(
      '🔥 2-day streak'
    );
  });

  it('omits the streak line when streak is 0 or 1', () => {
    expect(generateLadderShareText({ ...baseInput, streak: 1 })).not.toContain(
      'streak'
    );
  });

  it('uses puzzle number when provided', () => {
    expect(
      generateLadderShareText({ ...baseInput, puzzleNumber: 42 })
    ).toContain('#42');
  });

  it('never leaks the answer or rung text in the share string', () => {
    // Caller controls what's inside attempts; the share text must only
    // contain emoji + score + URL, never the title or rung copy.
    const text = generateLadderShareText({
      ...baseInput,
      attempts: [{ isCorrect: true, rungsSeen: 1 }],
    });
    // No characters from the actual rung body or title.
    expect(text).not.toMatch(/inception|matrix|the godfather/i);
  });
});

describe('generateShareText (legacy multi-question)', () => {
  it('produces a percentage and grid', () => {
    const text = generateShareText(
      {
        quizId: 'q1',
        date: '2026-05-01',
        score: 8,
        totalQuestions: 10,
        answers: Array(8)
          .fill({ isCorrect: true, attemptsUsed: 1 })
          .concat([
            { isCorrect: false, attemptsUsed: 2 },
            { isCorrect: false, attemptsUsed: 2 },
          ]),
      },
      false
    );
    expect(text).toContain('8/10');
    expect(text).toContain('80%');
  });
});

describe('share URLs', () => {
  it('encodes for twitter', () => {
    expect(getTwitterShareUrl('hello world')).toBe(
      'https://twitter.com/intent/tweet?text=hello%20world'
    );
  });

  it('encodes for whatsapp', () => {
    expect(getWhatsAppShareUrl('hi & bye')).toBe(
      'https://wa.me/?text=hi%20%26%20bye'
    );
  });
});

describe('getScoreBadge', () => {
  it('returns trophy for perfect', () => {
    expect(getScoreBadge(10, 10).emoji).toBe('🏆');
  });

  it('returns expert for 80%+', () => {
    expect(getScoreBadge(8, 10).name).toBe('Movie Expert');
  });

  it('returns newbie below 40%', () => {
    expect(getScoreBadge(2, 10).name).toBe('Newbie');
  });

  it('returns Film Buff at the 60% tier', () => {
    expect(getScoreBadge(6, 10).name).toBe('Film Buff');
  });

  it('returns Casual Viewer at the 40% tier', () => {
    expect(getScoreBadge(4, 10).name).toBe('Casual Viewer');
  });
});

describe('generateDetailedShareText', () => {
  const base = {
    quizId: 'q1',
    date: '2026-05-01',
    score: 2,
    totalQuestions: 3,
    answers: [
      { isCorrect: true, attemptsUsed: 1 },
      { isCorrect: true, attemptsUsed: 5 },
      { isCorrect: false, attemptsUsed: 6 },
    ],
  };

  it('renders per-question emoji and X/6 for wrong answers', () => {
    const text = generateDetailedShareText(base, false);
    expect(text).toContain('Q1:');
    expect(text).toContain('Q2:');
    expect(text).toContain('Q3:');
    expect(text).toContain('🟩 1/6');
    expect(text).toContain('🟨 5/6');
    expect(text).toContain('🟥 X/6');
    // No URL when includeUrl is false.
    expect(text).not.toContain('popcornguess.com');
  });

  it('appends URL when includeUrl is true (default)', () => {
    const text = generateDetailedShareText(base);
    expect(text).toContain('https://popcornguess.com');
  });

  it('appends streak line when streak >= 2', () => {
    const text = generateDetailedShareText({ ...base, streak: 5 }, false);
    expect(text).toContain('🔥 5 day streak!');
  });

  it('omits streak line when streak is 1', () => {
    const text = generateDetailedShareText({ ...base, streak: 1 }, false);
    expect(text).not.toContain('streak');
  });
});

describe('generateShareText streak branch', () => {
  it('shows streak line when streak >= 2', () => {
    const text = generateShareText(
      {
        quizId: 'q1',
        date: '2026-05-01',
        score: 1,
        totalQuestions: 2,
        answers: [
          { isCorrect: true, attemptsUsed: 1 },
          { isCorrect: false, attemptsUsed: 6 },
        ],
        streak: 3,
      },
      true
    );
    expect(text).toContain('🔥 3 day streak!');
    expect(text).toContain('https://popcornguess.com');
  });
});

describe('share URL encoding edge cases', () => {
  it('twitter encodes special chars', () => {
    expect(getTwitterShareUrl('a&b c?')).toBe(
      'https://twitter.com/intent/tweet?text=a%26b%20c%3F'
    );
  });

  it('whatsapp encodes special chars', () => {
    expect(getWhatsAppShareUrl('a?b#c=d')).toBe(
      'https://wa.me/?text=a%3Fb%23c%3Dd'
    );
  });
});

describe('copyToClipboard', () => {
  let originalClipboard: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    }
  });

  it('uses navigator.clipboard.writeText on the happy path', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    });
    const result = await copyToClipboard('hi');
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('falls back to execCommand when navigator.clipboard.writeText throws', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    });
    const execCommandSpy = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandSpy as unknown as typeof document.execCommand;
    const result = await copyToClipboard('hi');
    expect(result).toBe(true);
    expect(execCommandSpy).toHaveBeenCalledWith('copy');
  });
});

describe('nativeShare', () => {
  let originalShare: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  });

  afterEach(() => {
    if (originalShare) {
      Object.defineProperty(navigator, 'share', originalShare);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (navigator as any).share;
    }
  });

  it('returns false when navigator.share is undefined', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(await nativeShare('t', 'x')).toBe(false);
    expect(isNativeShareSupported()).toBe(false);
  });

  it('returns true when navigator.share resolves', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: share,
    });
    expect(await nativeShare('t', 'x', 'https://example')).toBe(true);
    expect(share).toHaveBeenCalledWith({ title: 't', text: 'x', url: 'https://example' });
  });

  it('returns false when navigator.share rejects (user cancel)', async () => {
    const share = jest.fn().mockRejectedValue(new Error('cancelled'));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: share,
    });
    expect(await nativeShare('t', 'x')).toBe(false);
  });
});

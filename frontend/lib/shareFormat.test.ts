/**
 * Tests for share-format helpers — the Wordle-grid contract is the
 * one piece of UX users see most after every game, so it gets the
 * heaviest test coverage in the lib layer.
 */

import {
  generateEmojiGrid,
  generateLadderGrid,
  generateLadderShareText,
  generateShareText,
  getScoreBadge,
  getTwitterShareUrl,
  getWhatsAppShareUrl,
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
});

/**
 * Share Format Utilities
 *
 * Generates shareable quiz results in Wordle-style format:
 * - Spoiler-free visual grid
 * - Score display
 * - Streak information
 */

interface ShareResult {
  quizId: string;
  date: string;
  score: number;
  totalQuestions: number;
  answers: Array<{
    isCorrect: boolean;
    attemptsUsed: number;
  }>;
  streak?: number;
}

/**
 * Generate emoji grid for quiz results
 *
 * Uses color-coded squares:
 * - 🟩 Correct answer
 * - 🟨 Correct after hints
 * - 🟥 Incorrect
 */
export function generateEmojiGrid(answers: ShareResult['answers']): string {
  return answers
    .map((answer) => {
      if (answer.isCorrect) {
        // Green for correct, yellow if took many attempts
        return answer.attemptsUsed <= 2 ? '🟩' : '🟨';
      }
      return '🟥';
    })
    .join('');
}

/**
 * Generate attempt indicator for each question
 *
 * Shows how many guesses it took
 */
export function generateAttemptIndicator(attemptsUsed: number, maxAttempts: number = 6): string {
  return `${attemptsUsed}/${maxAttempts}`;
}

/**
 * Generate full share text for quiz results
 */
export function generateShareText(result: ShareResult, includeUrl: boolean = true): string {
  const { date, score, totalQuestions, answers, streak } = result;

  const percentage = Math.round((score / totalQuestions) * 100);
  const emojiGrid = generateEmojiGrid(answers);

  // Format date nicely
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let text = `🍿 PopcornGuess ${formattedDate}\n`;
  text += `${score}/${totalQuestions} (${percentage}%)\n\n`;
  text += `${emojiGrid}\n`;

  if (streak && streak > 1) {
    text += `\n🔥 ${streak} day streak!`;
  }

  if (includeUrl) {
    text += `\n\nhttps://popcornguess.com`;
  }

  return text;
}

/**
 * Generate detailed share text with attempt counts
 */
export function generateDetailedShareText(
  result: ShareResult,
  includeUrl: boolean = true
): string {
  const { date, score, totalQuestions, answers, streak } = result;

  const percentage = Math.round((score / totalQuestions) * 100);

  // Format date nicely
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let text = `🍿 PopcornGuess ${formattedDate}\n`;
  text += `${score}/${totalQuestions} (${percentage}%)\n\n`;

  // Detailed grid with attempt counts
  answers.forEach((answer, index) => {
    const emoji = answer.isCorrect
      ? answer.attemptsUsed <= 2
        ? '🟩'
        : '🟨'
      : '🟥';
    const attempts = answer.isCorrect
      ? `${answer.attemptsUsed}/6`
      : 'X/6';
    text += `Q${index + 1}: ${emoji} ${attempts}\n`;
  });

  if (streak && streak > 1) {
    text += `\n🔥 ${streak} day streak!`;
  }

  if (includeUrl) {
    text += `\n\nhttps://popcornguess.com`;
  }

  return text;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Share using native share API (mobile)
 */
export async function nativeShare(
  title: string,
  text: string,
  url?: string
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title,
      text,
      url,
    });
    return true;
  } catch {
    // User cancelled or share failed
    return false;
  }
}

/**
 * Check if native sharing is supported
 */
export function isNativeShareSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * Generate Twitter share URL
 */
export function getTwitterShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encodedText}`;
}

/**
 * Generate WhatsApp share URL
 */
export function getWhatsAppShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generate a Wordle-style ladder grid for the synopsis-ladder mode.
 *
 * The mode has one title to guess and a trail of up to `maxAttempts`
 * guesses. Each cell encodes the result of one attempt:
 *   - ⬛ wrong guess
 *   - 🟨 right answer but used the maximum hints (≥ 4 rungs revealed)
 *   - 🟩 right answer with at most 3 rungs revealed
 *   - ▫ unused attempts (only included if `padToMax` is true)
 *
 * `attempts` is ordered earliest → latest. The first correct answer ends
 * the puzzle, so `attempts` will contain at most one cell of green/yellow.
 */
export interface LadderAttempt {
  isCorrect: boolean;
  /** How many synopsis rungs the player saw before this attempt (1..maxRungs). */
  rungsSeen: number;
}

export function generateLadderGrid(
  attempts: LadderAttempt[],
  options: { maxAttempts?: number; padToMax?: boolean } = {}
): string {
  const { maxAttempts = 6, padToMax = false } = options;
  const cells: string[] = attempts.slice(0, maxAttempts).map((a) => {
    if (!a.isCorrect) {
      return '⬛';
    }
    return a.rungsSeen <= 3 ? '🟩' : '🟨';
  });

  if (padToMax) {
    while (cells.length < maxAttempts) {
      cells.push('▫');
    }
  }

  return cells.join('');
}

export interface LadderShareInput {
  date: string;
  puzzleNumber?: number;
  solved: boolean;
  rungsRevealed: number;
  maxAttempts?: number;
  attempts: LadderAttempt[];
  streak?: number;
  siteUrl?: string;
}

/**
 * Spoiler-free Wordle-style share text for synopsis-ladder.
 * Never reveals the title or the rung text.
 */
export function generateLadderShareText(input: LadderShareInput): string {
  const {
    date,
    puzzleNumber,
    solved,
    rungsRevealed,
    maxAttempts = 6,
    attempts,
    streak,
    siteUrl = 'https://popcornguess.com',
  } = input;

  const formatted = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const headline = puzzleNumber
    ? `🍿 PopcornGuess #${puzzleNumber}`
    : `🍿 PopcornGuess ${formatted}`;
  const score = solved ? `${rungsRevealed}/${maxAttempts}` : `X/${maxAttempts}`;
  const grid = generateLadderGrid(attempts, { maxAttempts, padToMax: true });

  let text = `${headline}\n${score}\n\n${grid}\n`;
  if (streak && streak > 1) {
    text += `\n🔥 ${streak}-day streak`;
  }
  text += `\n\n${siteUrl}`;
  return text;
}

/**
 * Get achievement badge based on score
 */
export function getScoreBadge(
  score: number,
  totalQuestions: number
): { emoji: string; name: string } {
  const percentage = (score / totalQuestions) * 100;

  if (percentage === 100) {
    return { emoji: '🏆', name: 'Perfect Score' };
  }
  if (percentage >= 80) {
    return { emoji: '⭐', name: 'Movie Expert' };
  }
  if (percentage >= 60) {
    return { emoji: '🎬', name: 'Film Buff' };
  }
  if (percentage >= 40) {
    return { emoji: '🍿', name: 'Casual Viewer' };
  }
  return { emoji: '📺', name: 'Newbie' };
}


'use client';

import Link from 'next/link';
import { StreakDisplay } from './StreakBadge';

/**
 * Quiz Results Component
 *
 * Displays quiz completion results with:
 * - Score and percentage
 * - Celebration animations for perfect scores
 * - Answer breakdown
 * - Streak update
 * - Share functionality
 */

interface QuestionResult {
  id: number;
  text: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
  attempts_used: number;
}

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  results: QuestionResult[];
  streak: number;
  bestStreak: number;
  timeTaken?: number;
  onShare?: () => void;
  onPlayAgain?: () => void;
}

export default function QuizResults({
  score,
  totalQuestions,
  results,
  streak,
  bestStreak,
  timeTaken,
  onShare,
  onPlayAgain,
}: QuizResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const isPerfect = score === totalQuestions;

  // Get emoji and message based on score
  const getScoreReaction = () => {
    if (percentage === 100) return { emoji: '🏆', message: 'Perfect Score!' };
    if (percentage >= 80) return { emoji: '🌟', message: 'Amazing!' };
    if (percentage >= 60) return { emoji: '👏', message: 'Great Job!' };
    if (percentage >= 40) return { emoji: '👍', message: 'Nice Try!' };
    return { emoji: '💪', message: 'Keep Practicing!' };
  };

  const { emoji, message } = getScoreReaction();

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Score celebration */}
      <div className="text-center mb-8">
        <div
          className={`text-7xl mb-4 ${isPerfect ? 'animate-bounce' : 'animate-bounce-in'}`}
        >
          {emoji}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
          {message}
        </h2>
        <p className="text-xl text-[var(--text-secondary)]">
          You scored{' '}
          <span className={isPerfect ? 'text-gradient-gold' : 'text-[var(--amber)]'}>
            {score}/{totalQuestions}
          </span>{' '}
          ({percentage}%)
        </p>
        {timeTaken && (
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Completed in {formatTime(timeTaken)}
          </p>
        )}
      </div>

      {/* Confetti for perfect score */}
      {isPerfect && <Confetti />}

      {/* Streak section */}
      <div className="mb-8">
        <StreakDisplay streak={streak} bestStreak={bestStreak} />
      </div>

      {/* Answer breakdown */}
      <div className="bg-[var(--background-secondary)] rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Answer Breakdown
        </h3>
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={result.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                result.is_correct
                  ? 'bg-[var(--success)]/10'
                  : 'bg-[var(--error)]/10'
              }`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  result.is_correct
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--error)] text-white'
                }`}
              >
                {result.is_correct ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-muted)] mb-1">
                  Q{index + 1}: {result.text.slice(0, 50)}...
                </p>
                <p className="text-[var(--text-primary)]">
                  <span className="font-medium">Answer:</span>{' '}
                  {result.correct_answer}
                </p>
                {!result.is_correct && result.user_answer && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Your guess: {result.user_answer}
                  </p>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {result.attempts_used}/{6} attempts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {onShare && (
          <button
            onClick={onShare}
            className="px-6 py-3 bg-[var(--gold)] text-[var(--background)] font-semibold 
                       rounded-full hover:bg-[var(--gold-light)] transition-colors
                       flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share Results
          </button>
        )}

        {onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 border-2 border-[var(--border-light)] text-[var(--text-primary)] 
                       font-semibold rounded-full hover:border-[var(--gold)] hover:text-[var(--gold)] 
                       transition-colors"
          >
            Practice Mode
          </button>
        )}

        <Link
          href="/"
          className="px-6 py-3 border-2 border-[var(--border-light)] text-[var(--text-primary)] 
                     font-semibold rounded-full hover:border-[var(--gold)] hover:text-[var(--gold)] 
                     transition-colors text-center"
        >
          Back to Home
        </Link>
      </div>

      {/* Come back tomorrow message */}
      <div className="mt-8 text-center">
        <p className="text-[var(--text-muted)]">
          🍿 New quiz drops at midnight UTC!
        </p>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Simple confetti component
function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        >
          <span
            style={{
              fontSize: `${12 + Math.random() * 12}px`,
              color: ['#d4af37', '#ff8c00', '#8b0000', '#22c55e'][
                Math.floor(Math.random() * 4)
              ],
            }}
          >
            ●
          </span>
        </div>
      ))}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}


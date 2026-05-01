'use client';

interface StreakDistributionProps {
  /**
   * Histogram of solves per attempt count.
   * Index 0 = solved on attempt 1, index 5 = solved on attempt 6, last cell = failed.
   * Length is always 7 (6 attempt buckets + 1 fail bucket).
   */
  histogram: number[];
  /** Highlight the player's bucket (0..5 for solved, 6 for fail). */
  highlightIndex?: number;
  className?: string;
}

const LABELS = ['1', '2', '3', '4', '5', '6', 'X'];

/**
 * Wordle's iconic guess-distribution histogram.
 *
 * Shows how many times the player has solved on each attempt count.
 * The active row is highlighted with the gold accent.
 */
export default function StreakDistribution({
  histogram,
  highlightIndex,
  className,
}: StreakDistributionProps): React.JSX.Element {
  const max = Math.max(1, ...histogram);

  return (
    <section
      className={`rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-5 ${className ?? ''}`}
      aria-label="Guess distribution"
    >
      <h3 className="text-base font-semibold mb-3 text-[var(--text-primary)]">
        Your guess distribution
      </h3>
      <ol className="space-y-2">
        {histogram.map((count, i) => {
          const widthPct = Math.max(7, (count / max) * 100);
          const isActive = i === highlightIndex;
          return (
            <li
              key={i}
              className="flex items-center gap-3"
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="w-6 text-sm font-semibold text-[var(--text-secondary)]">
                {LABELS[i]}
              </span>
              <div
                className={`h-6 rounded-md flex items-center justify-end pr-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-amber text-[var(--background)]'
                    : 'bg-[var(--background)] text-[var(--text-primary)]'
                }`}
                style={{ width: `${widthPct}%` }}
              >
                {count}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

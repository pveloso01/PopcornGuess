'use client';

/**
 * Streak Badge Component
 *
 * Displays the user's current streak with a flame icon.
 * This is a key psychological hook - the streak counter
 * leverages loss aversion to drive daily engagement.
 */

interface StreakBadgeProps {
  streak: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakBadge({
  streak,
  showLabel = false,
  size = 'md',
}: StreakBadgeProps) {
  // Size configurations
  const sizes = {
    sm: {
      container: 'px-2 py-1 gap-1',
      flame: 'text-sm',
      number: 'text-sm',
      label: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5 gap-1.5',
      flame: 'text-lg',
      number: 'text-base',
      label: 'text-xs',
    },
    lg: {
      container: 'px-4 py-2 gap-2',
      flame: 'text-2xl',
      number: 'text-xl',
      label: 'text-sm',
    },
  };

  const s = sizes[size];

  // Flame colors based on streak length
  const getFlameStyle = () => {
    if (streak === 0) {
      return {
        flame: '🔥',
        glow: 'none',
        textColor: 'text-[var(--text-muted)]',
      };
    }
    if (streak < 7) {
      return {
        flame: '🔥',
        glow: '0 0 10px rgba(255, 140, 0, 0.3)',
        textColor: 'text-[var(--amber)]',
      };
    }
    if (streak < 30) {
      return {
        flame: '🔥',
        glow: '0 0 15px rgba(255, 140, 0, 0.5)',
        textColor: 'text-[var(--amber-light)]',
      };
    }
    if (streak < 100) {
      return {
        flame: '🔥',
        glow: '0 0 20px rgba(212, 175, 55, 0.5)',
        textColor: 'text-[var(--gold)]',
      };
    }
    // 100+ day streak - legendary
    return {
      flame: '🔥',
      glow: '0 0 25px rgba(212, 175, 55, 0.7)',
      textColor: 'text-[var(--gold-light)]',
    };
  };

  const flameStyle = getFlameStyle();

  return (
    <div
      className={`inline-flex items-center ${s.container} rounded-full 
                  bg-[var(--background-secondary)] border border-[var(--border)]
                  hover:border-[var(--border-light)] transition-all duration-300 cursor-default
                  ${streak > 0 ? 'hover-lift' : ''}`}
      style={{
        boxShadow: flameStyle.glow,
      }}
      title={`${streak} day streak`}
    >
      {/* Flame icon with animation for active streaks */}
      <span
        className={`${s.flame} ${streak > 0 ? 'animate-pulse' : 'grayscale opacity-50'}`}
        role="img"
        aria-label="Streak flame"
      >
        {flameStyle.flame}
      </span>

      {/* Streak number */}
      <span className={`${s.number} font-bold ${flameStyle.textColor}`}>
        {streak}
      </span>

      {/* Optional label */}
      {showLabel && (
        <span className={`${s.label} text-[var(--text-muted)] ml-0.5`}>
          {streak === 1 ? 'day' : 'days'}
        </span>
      )}
    </div>
  );
}

/**
 * Large Streak Display Component
 *
 * Used on profile pages or streak milestone celebrations.
 */
export function StreakDisplay({
  streak,
  bestStreak,
}: {
  streak: number;
  bestStreak: number;
}) {
  const isOnFire = streak >= 7;
  const isLegendary = streak >= 100;

  return (
    <div className="text-center">
      {/* Main streak display */}
      <div
        className={`inline-flex flex-col items-center p-6 rounded-2xl 
                    bg-[var(--background-secondary)] border border-[var(--border)]
                    ${isOnFire ? 'animate-pulse-glow' : ''}`}
      >
        <div className="text-6xl mb-2">
          {isLegendary ? '🏆' : isOnFire ? '🔥' : '🔥'}
        </div>
        <div
          className={`text-5xl font-bold mb-1 ${isLegendary ? 'text-gradient-gold' : 'text-[var(--amber)]'}`}
        >
          {streak}
        </div>
        <div className="text-[var(--text-secondary)]">
          Current Streak
        </div>
      </div>

      {/* Best streak */}
      <div className="mt-4 text-[var(--text-muted)]">
        Best: <span className="text-[var(--gold)] font-semibold">{bestStreak}</span> days
      </div>

      {/* Milestone progress */}
      {streak > 0 && streak < 100 && (
        <div className="mt-4">
          <div className="text-sm text-[var(--text-muted)] mb-2">
            Next milestone: {getNextMilestone(streak)} days
          </div>
          <div className="h-2 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-amber transition-all duration-500"
              style={{
                width: `${getMilestoneProgress(streak)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getNextMilestone(streak: number): number {
  const milestones = [3, 7, 14, 30, 50, 100, 365];
  return milestones.find((m) => m > streak) || 365;
}

function getMilestoneProgress(streak: number): number {
  const milestones = [0, 3, 7, 14, 30, 50, 100, 365];
  for (let i = 0; i < milestones.length - 1; i++) {
    if (streak < milestones[i + 1]) {
      const prev = milestones[i];
      const next = milestones[i + 1];
      return ((streak - prev) / (next - prev)) * 100;
    }
  }
  return 100;
}




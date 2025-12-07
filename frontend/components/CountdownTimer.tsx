'use client';

/**
 * CountdownTimer Component
 *
 * Displays a countdown timer for blitz mode.
 * - Visual timer with progress ring
 * - Warning states (yellow < 30s, red < 10s)
 * - Sound effects (optional)
 * - Auto-submit when time runs out
 */

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
}

export default function CountdownTimer({
  totalSeconds,
  onTimeUp,
  isPaused = false,
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp]);

  const percentage = (secondsLeft / totalSeconds) * 100;
  const isWarning = secondsLeft <= 30 && secondsLeft > 10;
  const isCritical = secondsLeft <= 10;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex items-center gap-4">
      {/* Timer Display */}
      <div
        className={`text-4xl font-bold tabular-nums ${
          isCritical
            ? 'text-red-500 animate-pulse'
            : isWarning
              ? 'text-yellow-500'
              : 'text-[var(--accent-primary)]'
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      {/* Progress Ring */}
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="var(--background-secondary)"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={isCritical ? '#ef4444' : isWarning ? '#eab308' : 'var(--accent-primary)'}
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - percentage / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{secondsLeft}s</span>
        </div>
      </div>
    </div>
  );
}

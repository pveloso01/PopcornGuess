'use client';

/**
 * Streak Milestone Celebration Modal
 *
 * Displays when user reaches streak milestones (7, 30, 100 days)
 */

import Confetti from './Confetti';

interface StreakMilestoneProps {
  streak: number;
  isNewMilestone: boolean;
  onClose: () => void;
}

const MILESTONES = [
  { days: 7, title: '7-Day Streak! 🔥', reward: '1 Streak Freeze' },
  { days: 30, title: '30-Day Streak! 🌟', reward: '2 Streak Freezes' },
  { days: 100, title: '100-Day Streak! 🏆', reward: '3 Streak Freezes' },
];

export default function StreakMilestone({ streak, isNewMilestone, onClose }: StreakMilestoneProps) {
  const milestone = MILESTONES.find((m) => m.days === streak);
  const isOpen = isNewMilestone && !!milestone;

  if (!isOpen || !milestone) return null;

  return (
    <>
      <Confetti />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-[var(--background)] rounded-lg p-8 max-w-md w-full shadow-xl animate-fade-up">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 text-gradient-gold">{milestone.title}</h2>

            <div className="mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-[var(--text-secondary)] text-lg">
                You&apos;ve completed {streak} consecutive days!
              </p>
            </div>

            <div className="bg-[var(--background-secondary)] rounded-lg p-4 mb-6">
              <p className="text-sm text-[var(--text-secondary)] mb-1">Reward Unlocked</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{milestone.reward}</p>
            </div>

            <p className="text-[var(--text-secondary)] mb-6">
              Keep your streak alive! Come back tomorrow to continue.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-gradient-amber text-[var(--background)] font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

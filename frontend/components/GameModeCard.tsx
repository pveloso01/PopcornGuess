'use client';

/**
 * GameModeCard Component
 *
 * Displays a game mode option card with:
 * - Icon/emoji
 * - Title and description
 * - Difficulty indicator
 * - "Play" button
 */

import Link from 'next/link';

interface GameModeCardProps {
  icon: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  href: string;
  isAvailable?: boolean;
}

export default function GameModeCard({
  icon,
  title,
  description,
  difficulty,
  href,
  isAvailable = true,
}: GameModeCardProps) {
  const difficultyColors = {
    Easy: 'text-green-500',
    Medium: 'text-yellow-500',
    Hard: 'text-red-500',
  };

  return (
    <div className="bg-[var(--background-secondary)] rounded-lg p-6 hover:bg-[var(--background)] transition-all border border-transparent hover:border-[var(--accent-primary)] group">
      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>

      <h3 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">{title}</h3>

      <p className="text-[var(--text-secondary)] mb-4 min-h-[3rem]">{description}</p>

      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-semibold ${difficultyColors[difficulty]}`}>
          {difficulty}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {isAvailable ? 'Available now' : 'Coming soon'}
        </span>
      </div>

      {isAvailable ? (
        <Link
          href={href}
          className="block w-full py-3 px-6 bg-gradient-amber text-[var(--background)] font-bold rounded-lg text-center hover:opacity-90 transition-opacity"
        >
          Play Now
        </Link>
      ) : (
        <button
          disabled
          className="w-full py-3 px-6 bg-[var(--background)] text-[var(--text-secondary)] font-bold rounded-lg cursor-not-allowed opacity-50"
        >
          Coming Soon
        </button>
      )}
    </div>
  );
}

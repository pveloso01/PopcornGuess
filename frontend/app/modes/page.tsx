'use client';

/**
 * Game Modes Hub Page
 *
 * Central hub for all game modes:
 * - Daily Challenge
 * - Blitz Mode
 * - Practice Mode
 * - (Future modes)
 */

import GameModeCard from '@/components/GameModeCard';

export default function GameModesPage() {
  const gameModes = [
    {
      icon: '🗓️',
      title: 'Daily Challenge',
      description: 'One new puzzle every day. Build your streak and compete globally!',
      difficulty: 'Medium' as const,
      href: '/quiz/daily',
      isAvailable: true,
    },
    {
      icon: '⚡',
      title: 'Blitz Mode',
      description: 'Race against the clock! 60 seconds to answer as many as you can.',
      difficulty: 'Hard' as const,
      href: '/quiz/blitz',
      isAvailable: true,
    },
    {
      icon: '🎯',
      title: 'Practice Mode',
      description: 'Endless questions with no pressure. Perfect your skills!',
      difficulty: 'Easy' as const,
      href: '/quiz/practice',
      isAvailable: true,
    },
    {
      icon: '🏆',
      title: 'Tournament',
      description: 'Compete in weekly tournaments for exclusive rewards.',
      difficulty: 'Hard' as const,
      href: '#',
      isAvailable: false,
    },
    {
      icon: '👥',
      title: 'Multiplayer',
      description: 'Challenge your friends to head-to-head battles.',
      difficulty: 'Medium' as const,
      href: '#',
      isAvailable: false,
    },
    {
      icon: '🎲',
      title: 'Random Quiz',
      description: 'Feeling lucky? Get a completely random quiz!',
      difficulty: 'Medium' as const,
      href: '#',
      isAvailable: false,
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient-gold mb-4">Game Modes</h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            Choose your challenge! From daily puzzles to lightning-fast blitzes, there&apos;s
            something for every movie buff.
          </p>
        </div>

        {/* Game Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gameModes.map((mode, index) => (
            <GameModeCard key={index} {...mode} />
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-[var(--background-secondary)] rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-[var(--accent-primary)] mb-1">0</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Quizzes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[var(--accent-primary)] mb-1">0</div>
              <div className="text-sm text-[var(--text-secondary)]">Current Streak</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[var(--accent-primary)] mb-1">0%</div>
              <div className="text-sm text-[var(--text-secondary)]">Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[var(--accent-primary)] mb-1">-</div>
              <div className="text-sm text-[var(--text-secondary)]">Global Rank</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

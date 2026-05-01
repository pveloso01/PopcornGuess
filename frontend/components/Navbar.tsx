'use client';

import Link from 'next/link';
import { useState } from 'react';
import StreakBadge from './StreakBadge';
import { useStreak } from '@/hooks/useStreak';
import { isFeatureEnabled } from '@/lib/featureFlags';

/**
 * Navbar Component
 *
 * Simple, focused navigation (5-7 items max):
 * - Sticky for easy access
 * - Streak counter with flame icon (psychological hook)
 * - Mobile hamburger menu for responsive design
 */

interface NavLink {
  href: string;
  label: string;
  flag?: 'modes' | 'leaderboard' | 'profile';
}

const ALL_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/quiz/daily', label: 'Daily Puzzle' },
  { href: '/modes', label: 'Game Modes', flag: 'modes' },
  { href: '/leaderboard', label: 'Leaderboard', flag: 'leaderboard' },
  { href: '/help', label: 'How to play' },
];

function getActiveLinks(): NavLink[] {
  return ALL_LINKS.filter((link) => !link.flag || isFeatureEnabled(link.flag));
}

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentStreak } = useStreak();
  const activeLinks = getActiveLinks();

  return (
    <nav className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-lg border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🍿</span>
            <span className="text-gradient-gold">PopcornGuess</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {activeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] 
                           rounded-lg hover:bg-[var(--background-secondary)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side - Streak Badge */}
          <div className="flex items-center gap-4">
            <StreakBadge streak={currentStreak} />

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[var(--background-secondary)] transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6 text-[var(--text-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-[var(--text-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)] animate-fade-in">
            <div className="flex flex-col gap-1">
              {activeLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] 
                             rounded-lg hover:bg-[var(--background-secondary)] transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}




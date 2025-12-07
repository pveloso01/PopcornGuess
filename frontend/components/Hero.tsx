'use client';

import Link from 'next/link';

/**
 * Hero Component
 *
 * Landing page hero section following the 5-second rule:
 * - Clear value proposition immediately visible
 * - Catchy tagline that communicates the game concept
 * - Prominent CTA with warm accent color
 * - Above-the-fold optimization
 */
export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient and effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)]" />

      {/* Decorative film reel effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,var(--gold)_20px,var(--gold)_22px)]" />
      </div>

      {/* Spotlight effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(212,175,55,0.15)_0%,transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-up">
        {/* Popcorn emoji and badge */}
        <div className="mb-6 animate-float">
          <span className="text-6xl md:text-7xl" role="img" aria-label="Popcorn">
            🍿
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
          <span className="text-[var(--text-primary)]">Your Daily </span>
          <span className="text-gradient-gold">Movie Quiz</span>
          <span className="text-[var(--text-primary)]"> Challenge</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl lg:text-2xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto leading-relaxed">
          Test your knowledge of films and TV shows with a new quiz every day.
          Build your streak, compete on leaderboards, and become a cinema legend!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/quiz"
            className="group relative px-8 py-4 bg-gradient-amber text-[var(--background)] font-bold text-lg rounded-full 
                       hover-lift glow-amber transition-all duration-300 
                       hover:shadow-[0_0_30px_rgba(255,140,0,0.5)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Today&apos;s Quiz
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
          </Link>

          <Link
            href="/how-to-play"
            className="px-8 py-4 border-2 border-[var(--border-light)] text-[var(--text-primary)] font-semibold text-lg 
                       rounded-full hover:border-[var(--gold)] hover:text-[var(--gold)] 
                       transition-colors duration-300"
          >
            How to Play
          </Link>
        </div>

        {/* Stats badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            <span className="text-sm md:text-base">New quiz daily</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-sm md:text-base">Track your streak</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <span className="text-sm md:text-base">Compete globally</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-[var(--text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}


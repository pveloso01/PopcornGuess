import Hero from '@/components/Hero';
import FeatureCards from '@/components/FeatureCards';
import StructuredData, { siteJsonLd, gameJsonLd } from '@/components/StructuredData';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://popcornguess.example'
).replace(/\/$/, '');

/**
 * Landing Page
 *
 * Follows the 5-second rule for capturing user attention:
 * - Clear value proposition immediately visible
 * - Engaging hero section with warm CTA
 * - Feature highlights to showcase benefits
 * - Above-the-fold optimization
 */
export default function Home() {
  return (
    <main className="min-h-screen">
      <StructuredData id="ld-site" data={siteJsonLd(SITE_URL)} />
      <StructuredData id="ld-game" data={gameJsonLd(SITE_URL)} />
      {/* Hero Section - Immediate hook */}
      <Hero />

      {/* Feature Cards - Why users should play */}
      <FeatureCards />

      {/* How It Works Section */}
      <section className="py-16 md:py-24 px-4 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            <span className="text-[var(--text-primary)]">How to </span>
            <span className="text-gradient-gold">Play</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-amber flex items-center justify-center text-2xl font-bold text-[var(--background)]">
                1
              </div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
                Start the Quiz
              </h3>
              <p className="text-[var(--text-secondary)]">
                Each day brings a new set of movie and TV trivia questions.
                No account needed to play!
              </p>
            </div>

            {/* Step 2 */}
            <div
              className="animate-fade-up"
              style={{ animationDelay: '100ms' }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-amber flex items-center justify-center text-2xl font-bold text-[var(--background)]">
                2
              </div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
                Guess the Answer
              </h3>
              <p className="text-[var(--text-secondary)]">
                Use clues like images, quotes, or emojis. You have 6 attempts
                per question - use hints if stuck!
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="animate-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-amber flex items-center justify-center text-2xl font-bold text-[var(--background)]">
                3
              </div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
                Share & Compete
              </h3>
              <p className="text-[var(--text-secondary)]">
                Share your results (spoiler-free!), build your streak, and
                climb the global leaderboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="animate-scale-in" style={{ animationDelay: '0ms' }}>
              <div className="text-4xl md:text-5xl font-bold text-[var(--gold)] mb-2">
                24h
              </div>
              <p className="text-[var(--text-secondary)]">New quiz every day</p>
            </div>
            <div
              className="animate-scale-in"
              style={{ animationDelay: '100ms' }}
            >
              <div className="text-4xl md:text-5xl font-bold text-[var(--amber)] mb-2">
                6
              </div>
              <p className="text-[var(--text-secondary)]">Attempts per question</p>
            </div>
            <div
              className="animate-scale-in"
              style={{ animationDelay: '200ms' }}
            >
              <div className="text-4xl md:text-5xl font-bold text-[var(--velvet-light)] mb-2">
                ∞
              </div>
              <p className="text-[var(--text-secondary)]">Streak potential</p>
            </div>
            <div
              className="animate-scale-in"
              style={{ animationDelay: '300ms' }}
            >
              <div className="text-4xl md:text-5xl font-bold text-[var(--success)] mb-2">
                Free
              </div>
              <p className="text-[var(--text-secondary)]">Forever to play</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-[var(--background-secondary)] to-[var(--background)]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🎬</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text-primary)]">
            Ready for Today&apos;s Challenge?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            The daily quiz resets at midnight UTC. Don&apos;t miss out!
          </p>
          <a
            href="/quiz/daily"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-amber text-[var(--background)] 
                       font-bold text-lg rounded-full hover-lift glow-amber transition-all duration-300
                       hover:shadow-[0_0_30px_rgba(255,140,0,0.5)]"
          >
            Start Playing Now
            <svg
              className="w-5 h-5"
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
          </a>
        </div>
      </section>
    </main>
  );
}

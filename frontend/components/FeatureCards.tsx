'use client';

/**
 * Feature Cards Component
 *
 * Highlights key features of PopcornGuess:
 * - Daily quiz (scarcity creates anticipation)
 * - Streak tracking (habit-forming engagement)
 * - Multiple game modes (variety to retain interest)
 * - Leaderboards (competitive engagement)
 */

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  accentColor: string;
  delay?: number;
}

function FeatureCard({
  icon,
  title,
  description,
  accentColor,
  delay = 0,
}: FeatureCardProps) {
  return (
    <div
      className="group relative p-6 md:p-8 rounded-2xl bg-[var(--background-secondary)] border border-[var(--border)]
                 hover:border-[var(--border-light)] transition-all duration-300 hover-lift animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accentColor}15 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div className="text-4xl md:text-5xl mb-4">{icon}</div>

        {/* Title */}
        <h3
          className="text-xl md:text-2xl font-bold mb-3 text-[var(--text-primary)]
                     group-hover:text-[var(--gold)] transition-colors duration-300"
        >
          {title}
        </h3>

        {/* Description */}
        <p className="text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Decorative corner accent */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-tr-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${accentColor} 50%)`,
        }}
      />
    </div>
  );
}

const features = [
  {
    icon: '🎬',
    title: 'Daily Quiz',
    description:
      'A fresh new movie & TV quiz every day. One chance to prove your knowledge - come back tomorrow for more!',
    accentColor: 'var(--amber)',
  },
  {
    icon: '🔥',
    title: 'Streak System',
    description:
      'Play daily to build your streak. How many consecutive days can you keep your cinema knowledge hot?',
    accentColor: 'var(--velvet)',
  },
  {
    icon: '🎮',
    title: 'Game Modes',
    description:
      'From timed blitz challenges to relaxed practice sessions - choose how you want to play.',
    accentColor: 'var(--gold)',
  },
  {
    icon: '🏆',
    title: 'Leaderboards',
    description:
      'Compete with players worldwide. Climb the ranks and prove you\'re the ultimate movie buff!',
    accentColor: 'var(--success)',
  },
];

export default function FeatureCards() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-[var(--text-primary)]">Why You&apos;ll </span>
            <span className="text-gradient-gold">Love</span>
            <span className="text-[var(--text-primary)]"> PopcornGuess</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            The ultimate daily movie trivia experience, designed to be fun,
            addictive, and rewarding.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 md:mt-16">
          <p className="text-[var(--text-secondary)] mb-6">
            Ready to test your movie knowledge?
          </p>
          <a
            href="/quiz"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--gold)] text-[var(--background)] 
                       font-semibold rounded-full hover:bg-[var(--gold-light)] transition-colors duration-300"
          >
            Play Now - It&apos;s Free!
            <span className="text-xl">🍿</span>
          </a>
        </div>
      </div>
    </section>
  );
}




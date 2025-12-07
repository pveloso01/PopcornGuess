'use client';

import { useEffect, useState } from 'react';

/**
 * Confetti Component
 *
 * Celebratory confetti animation for:
 * - Perfect scores
 * - Streak milestones
 * - Special achievements
 */

interface ConfettiProps {
  active?: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
}

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'star';
}

const DEFAULT_COLORS = [
  'var(--gold)',
  'var(--amber)',
  'var(--velvet-light)',
  'var(--success)',
  'var(--gold-light)',
];

export default function Confetti({
  active = true,
  duration = 4000,
  particleCount = 50,
  colors = DEFAULT_COLORS,
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(active);

  useEffect(() => {
    if (active) {
      setIsVisible(true);
      
      // Generate particles
      const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1000,
        duration: 2000 + Math.random() * 2000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        shape: (['circle', 'square', 'star'] as const)[Math.floor(Math.random() * 3)],
      }));
      
      setParticles(newParticles);

      // Hide after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, particleCount, colors, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            animation: `confetti-fall ${particle.duration}ms linear ${particle.delay}ms forwards`,
          }}
        >
          <ParticleShape
            shape={particle.shape}
            color={particle.color}
            size={particle.size}
          />
        </div>
      ))}

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function ParticleShape({
  shape,
  color,
  size,
}: {
  shape: 'circle' | 'square' | 'star';
  color: string;
  size: number;
}) {
  if (shape === 'circle') {
    return (
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      />
    );
  }

  if (shape === 'square') {
    return (
      <div
        className="rounded-sm"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      />
    );
  }

  // Star shape using CSS
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid ${color}`,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderTop: `${size}px solid ${color}`,
          position: 'absolute',
          top: size * 0.3,
          left: -size / 2,
        }}
      />
    </div>
  );
}

/**
 * Celebration - A more elaborate celebration animation
 */
export function Celebration({
  show = false,
  emoji = '🎉',
  message = 'Congratulations!',
  onComplete,
}: {
  show?: boolean;
  emoji?: string;
  message?: string;
  onComplete?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Confetti background */}
      <Confetti active={true} particleCount={100} />

      {/* Celebration message */}
      <div className="text-center animate-bounce-in">
        <div className="text-8xl mb-4">{emoji}</div>
        <h2 className="text-4xl font-bold text-gradient-gold">{message}</h2>
      </div>
    </div>
  );
}

/**
 * Streak Fire - Fire animation for streak display
 */
export function StreakFire({
  intensity = 1,
  className = '',
}: {
  intensity?: number;
  className?: string;
}) {
  const flames = Math.min(Math.max(intensity, 1), 5);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {Array.from({ length: flames }).map((_, i) => (
        <span
          key={i}
          className="text-2xl animate-pulse"
          style={{
            animationDelay: `${i * 100}ms`,
            filter: `hue-rotate(${i * 10}deg)`,
          }}
        >
          🔥
        </span>
      ))}
    </div>
  );
}


/**
 * PopcornGuess Design Tokens
 *
 * Cinema-inspired design system with:
 * - Deep blacks (theater darkness)
 * - Golden accents (classic Hollywood)
 * - Red velvet tones (theater seats)
 * - Warm amber for CTAs (popcorn warmth)
 */

export const colors = {
  // Core
  background: {
    primary: '#0a0a0a',
    secondary: '#141414',
    tertiary: '#1f1f1f',
  },
  foreground: {
    primary: '#fafaf9',
    secondary: '#a8a8a8',
    muted: '#6b7280',
  },

  // Cinema Palette
  gold: {
    light: '#ffed4a',
    DEFAULT: '#ffd700',
    dark: '#e6b800',
  },
  velvet: {
    light: '#b22222',
    DEFAULT: '#8b0000',
    dark: '#5c0000',
  },
  amber: {
    light: '#ffa500',
    DEFAULT: '#ff8c00',
    dark: '#cc7000',
  },

  // Feedback
  success: {
    light: '#4ade80',
    DEFAULT: '#22c55e',
  },
  error: {
    light: '#f87171',
    DEFAULT: '#ef4444',
  },
  warning: '#f59e0b',
  info: '#3b82f6',

  // Borders
  border: {
    DEFAULT: '#2e2e2e',
    light: '#404040',
  },
} as const;

export const gradients = {
  gold: `linear-gradient(135deg, ${colors.gold.dark} 0%, ${colors.gold.DEFAULT} 50%, ${colors.gold.light} 100%)`,
  velvet: `linear-gradient(135deg, ${colors.velvet.dark} 0%, ${colors.velvet.DEFAULT} 50%, ${colors.velvet.light} 100%)`,
  amber: `linear-gradient(135deg, ${colors.amber.dark} 0%, ${colors.amber.DEFAULT} 50%, ${colors.amber.light} 100%)`,
  dark: `linear-gradient(180deg, ${colors.background.primary} 0%, ${colors.background.secondary} 100%)`,
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
  glowGold: '0 0 20px rgba(255, 215, 0, 0.4)',
  glowAmber: '0 0 20px rgba(255, 140, 0, 0.3)',
} as const;

export const animation = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const;

export const borderRadius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
} as const;

// Streak milestone badges
export const streakMilestones = {
  3: { name: 'Warming Up', color: colors.amber.DEFAULT },
  7: { name: 'Week Warrior', color: colors.amber.light },
  14: { name: 'Dedicated Player', color: colors.gold.dark },
  30: { name: 'Monthly Master', color: colors.gold.DEFAULT },
  50: { name: 'Half Century', color: colors.gold.light },
  100: { name: 'Century Champion', color: colors.velvet.DEFAULT },
  365: { name: 'Legend', color: colors.velvet.light },
} as const;

// Quiz difficulty colors
export const difficultyColors = {
  easy: colors.success.DEFAULT,
  medium: colors.warning,
  hard: colors.error.DEFAULT,
} as const;

// Question type icons
export const questionTypeIcons = {
  text: '📝',
  image: '🖼️',
  quote: '💬',
  emoji: '🎬',
  audio: '🎵',
  silhouette: '👤',
} as const;

export default {
  colors,
  gradients,
  shadows,
  animation,
  spacing,
  borderRadius,
  fontSize,
  streakMilestones,
  difficultyColors,
  questionTypeIcons,
};

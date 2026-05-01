/**
 * Compile-time feature flags driven by NEXT_PUBLIC_FEATURE_FLAGS.
 *
 * Format: comma-separated flag names. Anything in the env var is "on".
 * Example:
 *   NEXT_PUBLIC_FEATURE_FLAGS=blitz,practice,leaderboard,profile,friends
 *
 * Phase-1 launch ships with an empty list, so only `/`, `/quiz/daily`,
 * `/quiz/results`, and the legal pages are reachable.
 */

const RAW = (process.env.NEXT_PUBLIC_FEATURE_FLAGS ?? '').toLowerCase();

const ENABLED: ReadonlySet<string> = new Set(
  RAW.split(',')
    .map((f) => f.trim())
    .filter(Boolean)
);

export type FeatureFlag =
  | 'blitz'
  | 'practice'
  | 'modes'
  | 'leaderboard'
  | 'profile'
  | 'friends'
  | 'leagues'
  | 'auth'
  | 'archive';

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return ENABLED.has(flag);
}

export function enabledFeatures(): FeatureFlag[] {
  const all: FeatureFlag[] = [
    'blitz',
    'practice',
    'modes',
    'leaderboard',
    'profile',
    'friends',
    'leagues',
    'auth',
    'archive',
  ];
  return all.filter(isFeatureEnabled);
}

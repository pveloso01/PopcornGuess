/**
 * featureFlags reads NEXT_PUBLIC_FEATURE_FLAGS at module load time, so
 * these tests use jest.isolateModules to simulate different env values.
 */

describe('featureFlags', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_FEATURE_FLAGS;

  afterEach(() => {
    process.env.NEXT_PUBLIC_FEATURE_FLAGS = ORIGINAL;
    jest.resetModules();
  });

  function loadWith(value: string | undefined) {
    if (value === undefined) {
      delete process.env.NEXT_PUBLIC_FEATURE_FLAGS;
    } else {
      process.env.NEXT_PUBLIC_FEATURE_FLAGS = value;
    }
    let mod: typeof import('./featureFlags') | undefined;
    jest.isolateModules(() => {
      mod = require('./featureFlags');
    });
    if (!mod) throw new Error('module did not load');
    return mod;
  }

  it('returns false for everything when env is empty', () => {
    const { isFeatureEnabled, enabledFeatures } = loadWith('');
    expect(isFeatureEnabled('blitz')).toBe(false);
    expect(enabledFeatures()).toEqual([]);
  });

  it('parses comma-separated values', () => {
    const { isFeatureEnabled, enabledFeatures } = loadWith(
      'blitz,leaderboard,profile'
    );
    expect(isFeatureEnabled('blitz')).toBe(true);
    expect(isFeatureEnabled('leaderboard')).toBe(true);
    expect(isFeatureEnabled('practice')).toBe(false);
    expect(enabledFeatures()).toEqual(['blitz', 'leaderboard', 'profile']);
  });

  it('tolerates whitespace and trailing commas', () => {
    const { isFeatureEnabled } = loadWith('  blitz , practice ,,modes ');
    expect(isFeatureEnabled('blitz')).toBe(true);
    expect(isFeatureEnabled('practice')).toBe(true);
    expect(isFeatureEnabled('modes')).toBe(true);
  });

  it('is case-insensitive', () => {
    const { isFeatureEnabled } = loadWith('BLITZ,Practice');
    expect(isFeatureEnabled('blitz')).toBe(true);
    expect(isFeatureEnabled('practice')).toBe(true);
  });

  it('treats undefined env as empty', () => {
    const { isFeatureEnabled } = loadWith(undefined);
    expect(isFeatureEnabled('blitz')).toBe(false);
  });
});

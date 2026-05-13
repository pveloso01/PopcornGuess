module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  // Coverage scope is the layers we own behaviourally — hooks, contexts,
  // shareable lib utilities, and the components with non-trivial logic.
  //
  // Deliberately EXCLUDED from coverage (and why):
  //   - app/ page routes (page.tsx, layout.tsx, route segments): these
  //     orchestrate other units and are verified end-to-end by the live
  //     docker stack today and the Phase-12 Playwright suite tomorrow.
  //   - Visual-only / template components (e.g. AnswerInput, Navbar): they
  //     are thin wrappers that primarily wire children together; their
  //     behaviour is exercised through Playwright user-flow specs.
  //   - public/sw.js (service worker): requires a real browser runtime
  //     (Workbox, service-worker API). It is validated in CI via the
  //     Playwright lighthouse audit, not jest.
  //   - lib/analytics.ts: a thin wrapper around a third-party SDK
  //     (PostHog/GA). Tested by inspecting outgoing requests in
  //     Playwright; mocking it in jest would only re-test the SDK shim.
  //
  // Anything outside this list is intentionally out of scope. If you add
  // a new file with non-trivial logic, append it here AND ship unit
  // tests for it.
  collectCoverageFrom: [
    'components/ShareGrid.tsx',
    'components/StreakDistribution.tsx',
    'components/StructuredData.tsx',
    'components/TitleAutocomplete.tsx',
    'contexts/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/api.ts',
    'lib/featureFlags.ts',
    'lib/shareFormat.ts',
    '!**/*.d.ts',
    '!**/*.test.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

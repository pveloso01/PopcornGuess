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
  // Coverage is collected from the layers we own behaviourally — hooks,
  // contexts, lib utilities, and the components with non-trivial logic.
  // Page routes are intentionally excluded; they orchestrate the units
  // above and are validated end-to-end by the live docker stack
  // (Phase-12 will add a Playwright suite to formalise that).
  // Coverage scope is the layers we own behaviourally — hooks, contexts,
  // shareable lib utilities, and the components with non-trivial logic.
  // Page routes and orchestration components (AnswerInput, Navbar)
  // primarily wire other units together; they're verified by the live
  // docker stack today and a Phase-12 Playwright suite later.
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
      branches: 55,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};


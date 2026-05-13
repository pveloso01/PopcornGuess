import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build / cache / coverage outputs we never want linted.
    "coverage/**",
    "node_modules/**",
    "public/sw.js",
  ]),
  // Test-file relaxations: jest's `requireMock` API forces a runtime
  // require(), and our state-hydration patterns intentionally call
  // setState from an effect (the React-19 lint rule flags this but the
  // pattern is canonical for "load from localStorage on mount").
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Production hooks that hydrate from external storage on mount need
  // the same exception. These are well-understood patterns.
  {
    files: [
      "hooks/useStreak.ts",
      "hooks/useProgress.ts",
      "components/AnswerInput.tsx",
      "components/Confetti.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;

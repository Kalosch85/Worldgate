// Flat config (ESLint 10). Enforces the ARCHITECTURE.md §1 layer boundaries.
//
// NOTE: ARCHITECTURE §1 names `import/no-restricted-paths` (eslint-plugin-import).
// That plugin has no ESLint 10 build (peer caps at eslint ^9), so the same
// boundaries are enforced here with ESLint-native rules. See
// docs/decisions/0001-toolchain-versions.md.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // TypeScript already resolves identifiers; no-undef would false-positive on
    // DOM/Node globals without the `globals` package.
    rules: {
      "no-undef": "off",
      // Match tsconfig's underscore convention (noUnusedLocals/Parameters
      // ignore `_`-prefixed names), so an intentionally-unused param like a
      // reducer's `_ctx` doesn't need two different suppressions.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },

  {
    // ARCHITECTURE §1: src/core is pure sim logic. It may import only from
    // core and data, and must not touch the DOM, Pixi, React, timers, or
    // non-injected sources of nondeterminism (Math.random, Date).
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/ui", "**/ui/**", "**/tactics-render", "**/tactics-render/**"],
              message: "src/core must not import from ui or tactics-render (ARCHITECTURE §1).",
            },
            {
              group: ["react", "react-dom", "react-dom/*", "pixi.js"],
              message: "src/core must stay DOM/Pixi/React-free (ARCHITECTURE §1).",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "src/core uses the injected Rng, not Math.random (ARCHITECTURE §1, §4)." },
        { object: "Date", property: "now", message: "src/core uses the injected clock, not Date.now (ARCHITECTURE §1)." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "src/core uses the injected clock, not new Date() (ARCHITECTURE §1)." },
        { selector: "CallExpression[callee.name=/^(setTimeout|setInterval)$/]", message: "src/core must not use timers (ARCHITECTURE §1)." },
      ],
    },
  },

  {
    // Tooling scripts and tests run in Node and may use whatever they need.
    // `any` is permitted here: validate-content walks already-zod-validated
    // heterogeneous unions, where narrowing every branch adds noise, not safety.
    files: ["scripts/**/*.ts", "**/*.{test,spec}.{ts,tsx}", "*.config.{ts,js}"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-properties": "off",
      "no-restricted-syntax": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);

# Decision 0001 — Toolchain versions (task 0.1)

Status: accepted, 2026-07-18. Scope: toolchain only. Does **not** change any
contract in `ARCHITECTURE.md` or `src/data/schemas.ts`.

## Context

Task 0.1 wires the toolchain named in `DEVELOPMENT_PLAN.md` (TypeScript strict,
Vite, React, Vitest, ESLint + Prettier). The foundation delivered in task 0.2
pinned `typescript@^7.0.2` (the native compiler). While wiring ESLint — which
`ARCHITECTURE.md §1` makes load-bearing ("import rules ... enforced by
ESLint") — two hard incompatibilities surfaced in this environment:

1. **`typescript-eslint` cannot run against TypeScript 7.** Its peer range is
   `>=4.8.4 <6.1.0`; forced onto TS 7 it crashes at load
   (`Cannot read properties of undefined (reading 'Cjs')` in
   `@typescript-eslint/typescript-estree`). ESLint cannot parse `.ts`/`.tsx`
   without this parser, so with TS 7 there is effectively no working linter.
2. **`eslint-plugin-import` has no ESLint 10 build.** Its peer caps at
   `eslint@^9`, and `no-restricted-paths` is unavailable on ESLint 10.

The plan anticipates exactly this: task 0.1 says to verify the toolchain in the
cloud environment and "revisit stack" if it does not work.

## Decision

1. **Pin `typescript@^5.9.3`** (highest ultra-stable line under the
   `typescript-eslint` cap; `6.0.x` is still the `beta` dist-tag). `strict` and
   `noUncheckedIndexedAccess` behave identically; the task 0.2 sources
   (`schemas.ts`, `validate-content.ts`, seed content) recompile green.
2. **Enforce §1 boundaries with ESLint-native rules** (`no-restricted-imports`,
   `no-restricted-properties`, `no-restricted-syntax`) instead of
   `import/no-restricted-paths`. Same guarantees: `src/core` cannot import
   `ui`/`tactics-render`/React/Pixi, nor use `Math.random`, `Date.now`,
   `new Date()`, or timers. See `eslint.config.js`.

## Revisit criteria

When `typescript-eslint` ships a TS 7-compatible release **and** an
ESLint-10-compatible import-boundary plugin exists, re-evaluate moving back to
TypeScript 7 and `import/no-restricted-paths`. Until then the versions above are
the working set for the prototype.

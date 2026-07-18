# Worldgate — session guide

**Before doing anything else, read [`ARCHITECTURE.md`](./ARCHITECTURE.md) in
full, and treat its §12 (Session protocol and model tiers) as binding.** It is
the contract for every implementation session; `DEVELOPMENT_PLAN.md` holds the
phases, tasks, and design-decision log.

## Obey §12 escalation

`ARCHITECTURE.md §12` defines the model tiers (Fable / Opus / Sonnet) and the
**escalation triggers**. Stop and hand up — do **not** improvise — when any of
these apply:

1. The task appears to require editing `src/data/schemas.ts`, `ARCHITECTURE.md`,
   or any reducer's action contract. (Schemas and architecture are
   Fable/Opus-tier; a Sonnet session must not modify them.)
2. A spec is ambiguous, or two specs conflict.
3. A change would cross the layer boundaries in §1, or touch RNG/determinism (§4).
4. Game-balance numbers are needed that no spec provides.
5. The same bug survives two fix attempts.

De-escalation: once the higher tier produces the spec or contract change,
implementation returns to Sonnet. Every session references its task id in
`DEVELOPMENT_PLAN.md` and the relevant `docs/specs/*.md`, and honors the
universal DoD: **tests green, CI deploy succeeds, task checked off.**

## Architecture rules you must not break (see §1)

- `src/core/` is pure sim logic. It imports only from `src/core` and `src/data`
  — never from `src/ui`, `src/tactics-render`, React, or Pixi — and never uses
  `Math.random`, `Date.now`, `new Date()`, or timers (RNG and clock are
  injected). ESLint enforces this; do not disable those rules to get around it.
- All game content lives in `src/data/content/*.json`, validated by the zod
  schemas at load and in CI (`npm run validate-content`).
- All game-state changes go through typed actions/reducers on `GameState`.

## Toolchain (task 0.1)

Vite + React + TypeScript (strict) + Vitest + ESLint + Prettier. Commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (enforces §1 boundaries) |
| `npm test` | Vitest (headless) |
| `npm run validate-content` | zod + referential-integrity check on `src/data/content` |
| `npm run build` | Production build to `dist/` (GitHub Pages base `/worldgate/`) |

CI (`.github/workflows/ci.yml`) runs typecheck → lint → test → validate-content
→ build on every push/PR, and deploys `dist/` to GitHub Pages on `main`.

Dependencies install automatically at session start via
`.claude/hooks/session-start.sh`. TypeScript is pinned below 6.1 for
`typescript-eslint` compatibility — see
[`docs/decisions/0001-toolchain-versions.md`](./docs/decisions/0001-toolchain-versions.md)
before changing it.

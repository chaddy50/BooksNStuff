# AGENTS.md

Media Tracker: a TanStack Start (React) app for tracking media (movies, shows, books, etc.) with a Postgres database via Drizzle.

## Stack

- TanStack Start + React, routes under `src/routes/`
- Drizzle ORM + Postgres, schema/migrations managed via `db:generate` / `db:migrate` / `db:push`
- Vitest for unit tests (`vitest.config.ts`) and integration tests (`vitest.config.integration.ts`, needs `docker-compose.test.yml` / `.env.test`)
- Biome for lint/format (`pnpm check`, `pnpm format`, `pnpm lint`)
- i18n under `src/i18n/locales/`

## Layout

- `src/features/` — feature-first: each screen/feature owns its own components, hooks, and `__tests__/` (e.g. `src/features/screens/settings/`, `src/features/mediaItemSearch/`).
- `src/routes/` — TanStack Router file-based routes; `_authenticated/` requires auth, `api/` is server routes.
- `src/database/` — Drizzle schema and query helpers.
- `src/lib/` — cross-feature utilities (e.g. `genres/`, `queries/`).
- `src/components/` — shared UI components (`ui/` is the design-system layer) and shared hooks.
- Tests live in `__tests__/` next to the code they cover, not in a parallel tree.

## Commands

- `pnpm dev` — run the app locally.
- `pnpm test` — unit tests. `pnpm test:integration` — integration tests (spins up the test DB via the pretest hook).
- `pnpm typecheck`, `pnpm check` — before declaring work complete, run whichever of these apply to what you changed.
- `pnpm db:generate` / `pnpm db:migrate` — after editing `src/database/` schema.

## Conventions

- Feature-first placement: new code goes inside the relevant `src/features/**` folder, not into a generic shared bucket, unless it's genuinely used by 2+ features.
- Colocate tests in `__tests__/` beside the source file.
- Don't hand-edit generated Drizzle migration files; regenerate via `db:generate`.

## Personal Coding Style

Nathan's cross-cutting preferences, applied on top of whatever the surrounding code does
(prefer these even where local style differs, except for a genuine framework technical
requirement — that's correctness, not style):

- **Comments** — extremely sparse, the exception not the rule. Default to none; don't
  restate what code plainly does. Only write one for a genuinely complex edge case,
  workaround, or non-obvious constraint, and keep it to a single short line — never
  multi-line blocks or docstrings.
- **Naming** — descriptive and fully spelled out, even if longer (`selectedMediaItem`, not
  `selMedItem`). Abbreviate only widely-understood terms (`id`, `url`, `http`). Booleans
  start with a verb that reads as a yes/no question: `is`, `was`, `should`, `can`.
- **Functions** — small and single-purpose. Extract helpers readily. A function doing two
  things is two functions.
- **Error handling** — fail fast. Validate inputs/preconditions early and surface problems
  loudly rather than swallowing them. Don't add defensive guards that mask a real upstream
  bug — fix the caller instead.
- **Control flow** — guard clauses and early returns for edge cases; keep the happy path
  flat and un-nested.
- **Abstraction** — rule of three. Tolerate a little duplication; abstract once a pattern
  genuinely repeats. Don't build a framework for one caller.
- **Mutability** — immutable by default (`const`/`readonly`); introduce mutation only for
  a clear, deliberate reason.
- **File/feature organization** — follow the established local pattern above; don't
  introduce a new architectural or directory pattern without precedent or an explicit need.

## Git & Commits

- **Never include Claude (or any AI assistant) as a commit co-author or contributor.** No `Co-Authored-By: Claude` trailer, no "Generated with Claude Code" line, no assistant mention in commit messages, PR titles, or PR descriptions. Write commits as the author, describing the change and why.
- Create commits only when explicitly asked.

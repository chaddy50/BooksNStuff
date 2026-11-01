# Contributing

Thanks for your interest in contributing. Participation in this project means following
the [Code of Conduct](./CODE_OF_CONDUCT.md).

Found a security vulnerability? See [SECURITY.md](./SECURITY.md) instead of opening a
public issue.

## Getting started

1. Clone the repo and run `npm ci`.
2. Copy `.env.example` to `.env` and fill in the required values.
3. Run `npm run dev` to start the app locally.

## Before opening a pull request

Run these and make sure they pass:

```
npm run check
npm run typecheck
npm test
```

If your change touches anything that talks to the database, also run
`npm run test:integration`.

## Pull request requirements

CI enforces two rules on every PR, so it's worth knowing them up front rather than finding
out from a failing check:

- **Every PR must reference an existing issue** with a closing keyword, e.g. `Closes #123`.
  If there isn't an issue for your change yet, open one first.
- **No AI-assistant attribution** anywhere in the PR title, PR body, or any commit message
  (no `Co-Authored-By: <AI tool>` trailers, no "Generated with ..." lines, no mentions of
  Claude, ChatGPT, Copilot, Gemini, Cursor, etc.).

The pull request template includes a checklist covering both of these.

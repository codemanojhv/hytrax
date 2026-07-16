# Contributing to Hytrax

Thanks for helping improve Hytrax. Keep changes small, deterministic, and provider-neutral.

## Before opening a pull request

1. Open an issue for a large or breaking change.
2. Install dependencies with `npm ci`.
3. Run `npm run build` and `npm test`.
4. Update the README or tests when behavior changes.

## Pull requests

- Explain the user problem and the smallest solution.
- Include tests for non-trivial behavior.
- Do not commit `.hytrax/`, `AGENTS.md`, `HANDOFF.md`, secrets, or generated local files.
- Keep the CLI provider-neutral; Hytrax must work with any coding agent.

## Development

```bash
npm ci
npm run build
npm test
```

Please use the existing TypeScript style and prefer the standard library over new dependencies.


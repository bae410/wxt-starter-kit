# Repository Guidelines

## Project Structure & Module Organization

- Source lives in `entrypoints/` (background, content, popup, options, sidepanel, devtools), `components/`, `lib/`, `assets/`, `public/`, `types/`, and `tests/`.
- WXT maps `entrypoints/*` directly to MV3 manifest outputs.
- Preferred path aliases: `@components`, `@lib`, `@assets`, `@entry` (see `wxt.config.ts`).

## Build, Test, and Development Commands

- Install: `pnpm install`
- Dev (Chromium default): `pnpm dev` | Specific: `pnpm dev:chrome` / `pnpm dev:firefox` / `pnpm dev:edge`
- Build: `pnpm build` | All browsers: `pnpm build:all` | Zip: `pnpm zip`
- Quality: `pnpm lint` (ESLint), `pnpm typecheck` (tsc), `pnpm format` (Prettier)
- Tests: `pnpm test` | Watch: `pnpm test:watch` | UI: `pnpm test:ui` | Coverage: `pnpm test -- --coverage`

## Coding Style & Naming Conventions

- TypeScript everywhere; 2‑space indent.
- Prettier: `singleQuote: true`, `trailingComma: all`, `printWidth: 100`, `semi: true`.
- ESLint enforces import ordering and React/TS rules; prefer absolute imports via aliases.
- Components: PascalCase file + export (e.g., `Button.tsx`); hooks `use*`.
- Group UI primitives under `components/ui`, features under `components/features`.

## Testing Guidelines

- Vitest with `happy-dom`; tests in `tests/` and co‑located where helpful.
- Use `*.test.ts` or `*.test.tsx`. Unit tests for `lib/*`; integration for messaging/storage flows; light E2E stubs under `tests/e2e`.
- Coverage reporters are configured; no strict threshold enforced—aim for meaningful coverage on new/changed code.

## Commit & Pull Request Guidelines

- History is descriptive; Conventional Commits are recommended (not enforced):
  - Examples: `feat: add sidepanel activity stream`, `fix(storage): handle empty state`.
- Before opening a PR: run `pnpm lint && pnpm typecheck && pnpm test`.
- PRs should include: clear scope/description, linked issues, and screenshots/GIFs for UI changes (popup/options/sidepanel/devtools).
- If permissions, locales, or routing change, update `wxt.config.ts` and `public/_locales/*` accordingly.

## Security & Configuration Tips

- Keep `manifest.permissions` and `host_permissions` minimal (see `wxt.config.ts`).
- Do not commit secrets; prefer server‑side APIs for sensitive work.
- Update `assets/icons/*` and `zip.artifactTemplate` before releases.

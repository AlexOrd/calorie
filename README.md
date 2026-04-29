# Calorie

Local-First personal food-quota diary as a PWA + Telegram WebApp.

- **Stack:** Vite + Svelte 5 (runes) + TypeScript + Tailwind v4 + Melt UI + Lucide + Motion One + localforage + vite-plugin-pwa.
- **Storage:** Telegram CloudStorage when opened inside Telegram; IndexedDB (via localforage) everywhere else.
- **Charts:** native SVG (no external chart library).
- **Live:** https://calorie.ordynski.com/

## Local development

```bash
pnpm install
pnpm dev          # Vite dev server on http://localhost:5173/
pnpm check        # svelte-check (TypeScript + Svelte)
pnpm lint         # ESLint
pnpm format       # Prettier (writes)
pnpm format:check # Prettier (CI mode)
pnpm build        # Production build to dist/
pnpm preview      # Serve dist/ locally on http://localhost:4173/
```

> **pnpm only.** The repo pins the public npm registry via `.npmrc`. If your shell wraps `pnpm` (e.g. via Aikido), use `command pnpm <args>` to bypass the wrapper.

## Pre-commit hooks

Husky + lint-staged + svelte-check run on every commit. Don't bypass with `--no-verify` — the same checks run in CI and will fail the deploy.

## Deploy

Pushing to `master` triggers `.github/workflows/deploy.yml`:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm format:check && pnpm check`
3. `pnpm build`
4. Upload `dist/` artifact and deploy to GitHub Pages.

The custom domain (`calorie.ordynski.com`) is wired via `public/CNAME`. The GitHub repo Settings → Pages → Source must be set to **GitHub Actions** (one-time).

## Telegram

After the GitHub Pages deploy is live, create a bot via @BotFather and run `/newapp` against the deployed URL — no code changes needed. The Telegram script tag is loaded in `index.html`; the runtime detects Telegram via `window.Telegram?.WebApp.initData` and switches storage / theme accordingly.

## Reference

Where the numbers and the catalog come from:

- **Formulas** — `docs/formulas.md` — every formula and threshold the app uses (BMR, TDEE, k_factor, macro targets, energy balance, animation thresholds), each with plain-language summary, code form, source, and a pointer to the implementation.
- **Food database** — `docs/food-database.md` — all 39 catalog items grouped by category, with per-100 g (or per-piece) macros, baseline quotas, and an explainer on `k_factor` personalization.

For LLM-assisted work, `CLAUDE.md` at the repo root is the operating manual.

## Specs and plans

Design specs and implementation plans live under `docs/superpowers/`:

- Specs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`

The original v1 design is `docs/superpowers/specs/2026-04-27-calorie-app-design.md`.

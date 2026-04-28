# Calorie — Working Notes for Claude

This file is the operating manual for an LLM working on this repo. Keep it terse and current.

## What this is

A **personal-only, local-first nutrition tracker** that runs as a Telegram mini app and as a PWA. One user, no accounts, no backend, no export. The app is opened from the user's Telegram, expands full-screen, and tracks the day against a category-quota system plus daily macro targets.

**Core domain:**

- **8 food categories (А–Ж + Алкоголь)**, each with its own 100% daily quota, expressed in grams or pieces per item.
- **Per-user food DB scaling** via a `k_factor` derived from the profile (height/weight/age/gender/activity → TDEE) so quotas adapt to the person rather than a generic adult.
- **Daily journal** of timestamped entries; sums roll into per-category progress (capped at 150% display) and per-macro targets (kcal/protein/carbs/fat).
- **Activity** (steps + strength toggle) tracked alongside food, on the same daily timeline.
- **Stats**: weekly heatmap by category + bar chart.

**Animations carry meaning:** confetti when a daily macro target is hit, shake on kcal overshoot, pulseWarning when a category crosses 100%, edge-flash on the day's first crossing. All gated through a persistent `macroCrossings` store so reloads don't replay past events.

## Stack

- **Svelte 5 (runes)**, **TypeScript**, **Vite 8**, **vite-plugin-pwa**
- **Tailwind CSS v4** with a single set of semantic CSS-variable tokens (`--bg`, `--surface`, `--surface-2`, `--border`, `--fg`, `--muted`, `--accent`, `--on-accent`, `--danger`, `--warn`, `--ok`, `--fat`)
- **Melt UI** (headless dialog used as the bottom sheet)
- **Lucide** (`@lucide/svelte`) for icons
- **`motion`** for animations, **`canvas-confetti`** for celebration bursts
- **`localforage`** (IndexedDB) for browser storage, **Telegram CloudStorage** when inside Telegram (selected at boot in `src/lib/storage/index.ts`)

## Hard project rules

These come from the user. Do not negotiate them.

- **pnpm only.** Never `npm` or `yarn`. Never commit a `package-lock.json` or `yarn.lock`.
- **Use `command pnpm`** (not bare `pnpm`) inside this sandbox to bypass the Aikido shell wrapper which is unreliable here.
- **No `as` type assertions in component code.** Use `interface Props` + destructure annotation for Svelte 5 props (the `$props<{}>()` generic form has known `$bindable` inference holes). Type-annotate JSON imports rather than asserting them. Use explicit branches for state-machine narrowing instead of `as`. Allowed exceptions: `{#each ... as item}` (syntax), `[...] as const`, `import { type X as Y }`, `JSON.parse(raw) as T` at type-erased boundaries.
- **Pre-commit hooks** run prettier + eslint + svelte-check via husky + lint-staged. Don't bypass them with `--no-verify` unless explicitly asked.
- **GPG signing** is required. If `git commit` fails inside the sandbox with `gpg: failed to create temporary file`, retry with `dangerouslyDisableSandbox: true`. This is a known sandbox restriction, not a config issue.
- **Conventional commits**, lowercase scope: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(deps|ui):`, `docs:`. Match recent history.
- **No automated test runner.** Verification gates are `command pnpm run check` (svelte-check), `command pnpm run lint` (eslint), `command pnpm run build` (vite). Plus manual viewport pass on iPhone 14 PM (430×932), Galaxy S25 (393×852), and iPhone SE 375×667 when UI changes.
- **Don't push** to `origin/master` unless the user explicitly asks.

## Architecture

```
src/
├── App.svelte              app-shell layout: flex h-dvh, sticky DateStrip + BottomNav,
│                           single scroll region (<main>); reads activeRoute store
├── app.css                 :root + .dark CSS-var palette → @theme map; body lock + scroll-region utility
├── main.ts                 boot Telegram (ready/expand/disableVerticalSwipes), bridge palette,
│                           apply theme mode, mount App
├── components/             leaf UI (CategoryCard, DailyTotals, DateStrip, EntrySheet, ProfileForm, ...)
│   └── onboarding/         multi-step onboarding wizard
├── routes/                 top-level "tabs" — Dashboard, Journal, Activity, Stats, Profile, Onboarding.
│                           Switched via class:hidden in App.svelte (no SvelteKit router).
├── state/*.svelte.ts       runes-based stores. See "State store pattern" below.
├── lib/                    pure helpers (date, macros, scaling, anim, telegram, theme, debounce)
│   └── storage/            StorageDriver abstraction with TelegramDriver + LocalforageDriver
├── data/                   static food DB seed (JSON)
└── types/                  type definitions (food, profile, telegram)
```

The mobile shell (locked viewport, single scroll region, sticky chrome) is the foundation everything sits on. Don't add new top-level scrollable containers.

## State store pattern

Every store is a `*.svelte.ts` file (Svelte 5 runes). Convention is a private `$state` variable and a public object exposing getters / setter methods. Do NOT use `svelte/store` writables.

```ts
// src/state/activeDate.svelte.ts (canonical example)
let _date = $state<string>(todayKey());

export const activeDate = {
  get value(): string {
    return _date;
  },
  set(this: void, date: string): void {
    _date = date;
  },
};
```

Why `this: void`: lets consumers pass methods as references without ESLint's `unbound-method` complaining.

Existing stores: `activeDate`, `activeRoute`, `profile`, `dailyLog`, `activity`, `personalizedDb`, `macroCrossings`. All persist via `src/lib/storage` where appropriate; load on app mount and on date change.

## Theme system

Two CSS-variable sets, one `.dark` class on `<html>` toggles between them. Mode resolves from `tg.colorScheme` first, `prefers-color-scheme` second; live-updates on Telegram's `themeChanged` event and on `prefers-color-scheme` `change`.

`--bg`, `--fg`, `--muted`, `--accent` reference `var(--tg-*, <Claude fallback>)`. `src/lib/theme.ts` `applyTelegramPalette()` writes `--tg-*` only when Telegram has a **custom** theme (i.e., `bg_color` is not one of the known default light/dark values for iOS / Android / Desktop). Default Telegram themes and pure browser sessions use the Claude warm palette.

Surfaces, borders, danger/warn/ok/fat are designed values that don't bridge from Telegram.

When you write a chip / button with an active state, **use a ternary**, not stacked classes:

```svelte
class={[
  'flex items-center justify-center rounded-lg border px-4 py-4 transition-colors',
  active ? 'bg-accent border-accent text-on-accent' : 'border-border bg-surface',
]}
```

Stacking `bg-surface` always-on with `bg-accent` conditional caused a real bug — Tailwind class-order ties had `bg-surface` winning, so the active state never highlighted.

## Animation patterns

Helpers live in `src/lib/anim.ts`. All early-return on `prefers-reduced-motion: reduce`.

- `pulseSuccess(el)` — small confirm pulse.
- `pulseWarning(el)` — red glow + tiny scale; per-category over-quota.
- `celebrate(el)` — bigger green halo.
- `shakeWarning(el)` — horizontal shake + red glow; kcal overshoot.
- `burstConfetti(originEl)` — small confetti from an element edge; macro target hit.
- `flashEdge(el)` — one-time accent inset shadow on `<main>`; first crossing of the day.

Trigger them on **state transitions**, not on every render. Use the `macroCrossings` store to persist per-day flags (`under | hit | over` for macros, `under | over` for categories). Always early-return when `!macroCrossings.isLoaded(date)` — the store loads async and a stale `'under'` fallback would re-fire animations on date change.

## Telegram integration

- `src/types/telegram.ts` declares the `TelegramWebApp` shape we rely on.
- `src/lib/telegram.ts` exposes `getTelegramUser()` returning `TelegramWebAppUser | null`.
- `src/main.ts` calls `tg.ready()`, `tg.expand()`, `tg.disableVerticalSwipes?.()` at boot.
- Theme: see "Theme system" above.
- Storage: `src/lib/storage/index.ts` picks `TelegramDriver` when `tg.initData && tg.CloudStorage` are present, else falls back to `LocalforageDriver`.

When running outside Telegram (`pnpm run dev` in a browser), the app shows "Одрі" + `/logo.png` as the guest user identity.

## Commit + PR flow

- Each task is a focused commit with a Conventional Commit message.
- Pre-commit hook runs prettier + eslint + svelte-check. If it modifies files, that's expected — re-stage if the user asked you to commit specific paths.
- Push only when the user says "push". Never force-push to master.
- For multi-task work: write a spec under `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, then a plan under `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`, then implement task-by-task with a fresh subagent per batch (`superpowers:subagent-driven-development`). Spec + quality review after each batch, plus a whole-implementation review before the final push.

## Known specs / plans

Located in `docs/superpowers/`:

- **2026-04-27-calorie-app** — original v1 spec + plan (the foundation: 8 categories, per-user scaling, journal, stats, PWA + Telegram).
- **2026-04-28-mobile-ui-fixes** — app-shell layout, sticky chrome, no-scrollbars, route store, date-tap-to-Dashboard, profile dirty tracking, Telegram user header, scroll-to-top on route change. Shipped.
- **2026-04-28-light-theme-and-limit-animations** — Claude-warm light/dark palette with Telegram bridging, semantic-token sweep across 17 files, edge-triggered macro animations + per-day persistence. Shipped.

When taking on new work, check whether it touches an existing spec; update or supersede it rather than diverging silently.

## Common gotchas

- **`$effect` reading async-loaded state:** wait for `isLoaded(date)` before reading `macroCrossings` in animation effects, otherwise stale defaults fire spurious animations on date change.
- **Tailwind class collisions:** when an active state needs to override an inactive one on the same property, use a ternary so only one set is present at a time.
- **Pipe characters in Markdown tables:** escape with `\|` inside table cells, or restructure — Prettier will mangle unescaped pipes.
- **`bind:this={(el) => fn(el)}` doesn't work** in Svelte 5 (must be an Identifier or MemberExpression). For per-iteration refs, prefer inlining over a snippet that needs to assign to multiple parent vars.
- **IDE "Cannot find name '$effect'" errors** are TypeScript-language-server staleness; the authoritative gate is `command pnpm run check`.

## When in doubt

- Read the relevant spec under `docs/superpowers/specs/`.
- Match existing patterns rather than introducing new abstractions.
- Run `command pnpm run check && command pnpm run lint` before claiming work is done.
- Ask the user before destructive or remote-affecting operations (force-push, branch deletion, dependency removal).

# Calorie — Working Notes for an LLM

Operating manual for an LLM working in this repo. Concise on purpose. For domain context (formulas, food catalog, full architecture history) follow the deep-dive pointers at the bottom.

---

## What this is

A personal-only, local-first nutrition tracker that runs as a Telegram mini app and a PWA. One user, no accounts, no backend, no export.

- **8 food categories** (А–З) each with a 100 % daily quota.
- **Per-user catalog scaling** via a `k_factor` derived from BMR/TDEE → portion sizes adapt to the person.
- **Daily journal** of timestamped entries.
- **Daily macro targets** (kcal/protein/carbs/fat) + **energy balance** (food intake − BMR − step kcal − training kcal).
- **Activity tracker:** steps + 3-slot training counter.
- **Animations carry meaning** — confetti when a macro hits target, shake on kcal overshoot, edge-flash on first day-crossing — gated through a persistent `macroCrossings` store so reloads don't replay past events.

For setup, scripts, deploy, and the user-facing project description, see [`README.md`](./README.md).

---

## Hard rules — non-negotiable

These come from the user. Do not negotiate them.

1. **pnpm only.** Never `npm` or `yarn`. Never commit `package-lock.json` or `yarn.lock`. Inside this sandbox, invoke as `command pnpm` — the bare wrapper is unreliable.
2. **No `as` type assertions in TS code.** Use `interface Props` + destructure annotation for Svelte 5 props (the `$props<{}>()` generic form has known `$bindable()` inference holes). Type-annotate JSON imports rather than asserting. Use explicit branches for state-machine narrowing. **Allowed:** `{#each ... as item}` (template syntax), `[...] as const`, `import { type X as Y }`, `JSON.parse(raw) as T` at type-erased boundaries.
3. **Pre-commit hooks** (Husky + lint-staged) run prettier + eslint + svelte-check on staged `*.ts` / `*.svelte` / `*.svelte.ts`. Don't bypass with `--no-verify` unless explicitly asked.
4. **Verification gates** before claiming work done: `command pnpm run check` (svelte-check) and `command pnpm run lint`. Both 0/0. Add `command pnpm run build` for substantial changes.
5. **GPG signing** is required. If `git commit` fails inside the sandbox with `gpg: failed to create temporary file`, retry with `dangerouslyDisableSandbox: true`. This is a known sandbox limitation, not a config bug.
6. **Conventional commits**, lowercase scope: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(deps|ui):`, `docs:`. Match recent history.
7. **Don't push** to `origin/master` unless the user explicitly asks. Never force-push to `master`.
8. **No automated test runner.** Verification is the gates above + manual viewport pass on the target devices when UI changes.
9. **Don't create `*.md` documentation** unless explicitly requested. Edit existing docs in `docs/` and `README.md` rather than scattering new ones.
10. **Changelog discipline.** Every user-visible change appends an entry to `src/data/changelog.ts` and bumps the version (patch for fixes, minor for features, major for big shifts). The displayed app version derives from `changelog[0].version` automatically — do not hand-edit it elsewhere; keep `package.json#version` in sync as the build sources `__APP_VERSION__` from there. All changelog text in Ukrainian.

---

## Stack at a glance

Svelte 5 (runes) · TypeScript (strict) · Vite 8 · Tailwind v4 (no config file — theme lives in `@theme` block in `src/app.css`) · Melt UI · Lucide · `motion` · `canvas-confetti` · `localforage` · `vite-plugin-pwa`. No SvelteKit. No SSR.

Path aliases (in `vite.config.ts` + `tsconfig.json`):

- `$lib/*` → `src/lib/*`
- `$state/*` → `src/state/*`
- `$types/*` → `src/types/*`

Target devices for manual viewport pass: iPhone 14 Pro Max (430×932), Galaxy S25 (393×852), iPhone SE (375×667). Mobile-first; desktop is two-pane (SideNav + main + DesktopHeader at md+).

---

## Project layout

```
src/
├── App.svelte              app-shell: flex h-dvh, sticky chrome, single scroll <main>
├── app.css                 :root + .dark CSS-var palette → @theme map
├── main.ts                 boot Telegram (ready/expand/disableVerticalSwipes), bridge palette,
│                           apply theme mode, mount App
├── components/             leaf UI; onboarding/ for the wizard steps
├── routes/                 5 tabs — Dashboard, Journal, Activity, Stats, Profile + Onboarding.
│                           Switched via class:hidden in App.svelte (no router).
├── state/*.svelte.ts       Svelte 5 runes stores. See "State store pattern" below.
├── lib/                    pure helpers (date, macros, scaling, energy, anim, haptics, dialog,
│                           theme, telegram, debounce); storage/ for the StorageDriver abstraction.
├── data/foodDb.json        seed catalog (see docs/food-database.md)
└── types/                  food, profile, log, telegram type definitions
```

---

## State store pattern

Every `*.svelte.ts` store follows this canonical shape (see `src/state/activeDate.svelte.ts`):

```ts
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

- Private `$state` at module scope; consumers never touch `_date`.
- `this: void` on methods so consumers can pass them as references without ESLint's `unbound-method` warning.
- Async stores load via `await store.load(date)` from `App.svelte`'s `onMount` and from the date-tracking `$effect`.
- Do **not** use `svelte/store` writables.

Existing stores: `activeDate`, `activeRoute`, `profile`, `dailyLog`, `activity`, `personalizedDb`, `macroCrossings`.

---

## Storage abstraction

All persistence goes through `src/lib/storage`. Two drivers:

- **TelegramDriver** — used when `window.Telegram?.WebApp.initData && CloudStorage` exist; wraps Telegram's callback-based CloudStorage as promises.
- **LocalforageDriver** — IndexedDB fallback for browser dev / PWA outside Telegram.

Storage keys in use:

| Key                    | Shape                                                  |
| ---------------------- | ------------------------------------------------------ |
| `user_profile`         | `UserProfile` (single record)                          |
| `log_YYYY-MM-DD`       | `LogEntry[]`                                           |
| `activity_YYYY-MM-DD`  | `DayActivity`                                          |
| `crossings_YYYY-MM-DD` | `DayCrossings` (animation gating; 7-day rolling prune) |

Never call `localStorage` / `IndexedDB` directly — always use the abstraction so the data flows to Telegram CloudStorage transparently.

---

## Theme system

Two CSS-variable sets (`:root` for light, `.dark` for dark) in `src/app.css`. `<html>` toggles the `.dark` class via `applyThemeMode`. Mode resolution: `tg.colorScheme` first, `prefers-color-scheme` as fallback. Live-updates on Telegram's `themeChanged` event and on `prefers-color-scheme` `change`.

`--bg`, `--fg`, `--muted`, `--accent` reference `var(--tg-*, <Claude fallback>)`. `applyTelegramPalette()` writes the `--tg-*` vars **only when Telegram has a custom theme** — default Telegram light/dark and pure browser sessions use the Claude warm palette. Surfaces / borders / danger / warn / ok / fat are designed values that don't bridge from Telegram.

**Tailwind class collision rule.** When a chip / button has an active state that overrides an inactive one on the same property, **use a ternary**, not stacked classes:

```svelte
class={[
  'flex items-center justify-center rounded-lg border px-4 py-4 transition-colors',
  active ? 'bg-accent border-accent text-on-accent' : 'border-border bg-surface',
]}
```

Stacking `bg-surface` always-on with `bg-accent` conditional caused a real bug — Tailwind class-order ties had `bg-surface` winning, so the active state never highlighted.

---

## Animation + haptics

Helpers in `src/lib/anim.ts`. All visual animations early-return on `prefers-reduced-motion: reduce`. **Haptics fire regardless** of reduced motion — they're non-visual and serve as accessibility GAINS (replacing visual cues for users who reduce motion).

| Helper                    | Visual                          | Haptic                            |
| ------------------------- | ------------------------------- | --------------------------------- |
| `pulseSuccess(el)`        | small scale pulse               | `impactOccurred('light')`         |
| `pulseWarning(el)`        | red glow + tiny scale           | `notificationOccurred('warning')` |
| `celebrate(el)`           | green halo + scale              | `notificationOccurred('success')` |
| `shakeWarning(el)`        | horizontal shake + red glow     | `notificationOccurred('warning')` |
| `burstConfetti(originEl)` | confetti from element edge      | `notificationOccurred('success')` |
| `flashEdge(el)`           | accent inset shadow on `<main>` | `impactOccurred('medium')`        |

**Trigger animations on state transitions, not on every render.** Use the `macroCrossings` store to persist per-day flags; always early-return when `!macroCrossings.isLoaded(date)` — the store loads async and a stale `'under'` fallback would re-fire animations on date change.

For interactions outside the anim helpers (tab switch, date tap, training-tile tap, category-card tap, delete confirm), call `hapticSelection()` / `hapticImpact(style)` from `$lib/haptics` directly.

---

## Changelog & versioning

The app's running version is the topmost entry in `src/data/changelog.ts`. To ship a change:

1. Append (or extend the topmost) entry in `src/data/changelog.ts`. Bump the version in the entry; bump `package.json#version` to match.
2. Add an item to the entry's `items` array:
   - `{ type: 'fix', text: '…' }` — short Ukrainian one-liner. Hidden from the auto-popup but visible in the Profile-icon changelog.
   - `{ type: 'feature', text: '…' }` — short Ukrainian one-liner. Shows in the auto-popup and the Profile changelog.
   - `{ type: 'major', title: '…', body: '…', icon?: 'Sparkles' | 'Droplet' | … }` — Ukrainian title + 1–2 sentence body, gets a hero card in the auto-popup. Use sparingly.
3. The `WhatsNewModal` fires once per user, on Dashboard mount, when their stored `last_shown_changelog_version` is older than `APP_VERSION`. First-ever launches are silent.
4. Available icons live in `CHANGELOG_ICONS` in `src/types/changelog.ts`. Add new ones to the whitelist explicitly so tree-shaking stays predictable.

---

## Native Telegram APIs

Three small wrapper modules give the mini app a native feel:

- **`$lib/haptics`** — `hapticImpact(style)`, `hapticNotify(type)`, `hapticSelection()`. Optional-chained over `window.Telegram?.WebApp?.HapticFeedback`. No-ops in browser dev.
- **`$lib/dialog`** — `confirmAsync(message)` and `alertAsync(message)`. Use Telegram's `showConfirm` / `showAlert` natively when available; fall back to `window.confirm` / `window.alert`.
- **`$lib/theme`** — `applyThemeMode`, `applyTelegramPalette`, `resolveThemeMode`, `isDefaultTelegramTheme`.

**BackButton** (top-left chevron in Telegram) is wired in `Onboarding.svelte` via a `$effect` that shows/hides per step and registers/unregisters the click handler. Pattern: `bb.onClick(handler); bb.show(); return () => { bb.offClick(handler); bb.hide(); };`.

The whole surface is graceful — every API access is optional-chained, types in `src/types/telegram.ts` are optional fields, older Telegram clients silently degrade.

---

## Common gotchas

- **Animation `$effect` reading async-loaded state.** Wait for `macroCrossings.isLoaded(date)` before reading the store; stale defaults fire spurious animations on date change.
- **Tailwind class collisions** — see "Tailwind class collision rule" above.
- **Markdown table pipes.** Pipe characters inside table cells (e.g., `0|1|2|3`) get mangled by prettier. Escape with `\|`, or use prose / words.
- **`bind:this={(el) => fn(el)}` doesn't work** in Svelte 5 — must be an Identifier or MemberExpression. For per-iteration refs, prefer inlining over a snippet that needs to assign to multiple parent vars.
- **IDE "Cannot find name '$effect'" errors** are TypeScript-language-server staleness (the LSP doesn't always know about runes). Authoritative gate is `command pnpm run check`.
- **Onboarding lives outside the app-shell**, so its root needs its own `h-dvh + overflow-y-auto + overscroll-contain`. Don't assume the body-locked shell is in scope when adding new "before profile exists" surfaces.
- **`bg-bg` on the body** is set by `app.css`. Pages don't need to repeat it; chrome elements like SideNav use it explicitly because they're bordering surfaces with different fills.

---

## Commit + PR flow

- One focused commit per task with a Conventional Commit message.
- Pre-commit hook may modify files (prettier reorders Tailwind classes, etc.). Let it; if you staged specific paths, re-stage if needed.
- Push only when the user says "push". Never force-push to master.
- For multi-task work, write a spec under `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, then a plan under `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`, then implement task-by-task. Spec + quality review per batch + a whole-implementation review before the final push.

---

## Deeper docs

- [`README.md`](./README.md) — user-facing project description, setup, scripts, deploy, Telegram setup.
- [`docs/formulas.md`](./docs/formulas.md) — every formula and threshold (BMR, TDEE, k_factor, macros, energy balance, animation thresholds) with plain-language summaries, code, sources, and file pointers.
- [`docs/food-database.md`](./docs/food-database.md) — full catalog of 39 items grouped by category + an explainer on `k_factor` personalization.
- [`docs/health-references.md`](./docs/health-references.md) — research-validated formulas not currently implemented (IBW, caloric safety floors, MoH 1073/1613 caps, pediatric percentiles, GLP-1 considerations). Companion to `formulas.md`.
- `docs/superpowers/specs/` — design specs (chronological, dated). The original v1 is `2026-04-27-calorie-app-design.md`.
- `docs/superpowers/plans/` — implementation plans matching the specs.

When in doubt: read the relevant spec first, match existing patterns, run the gates before claiming done, ask before destructive or remote-affecting operations.

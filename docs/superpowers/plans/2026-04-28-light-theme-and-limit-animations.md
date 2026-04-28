# Light Theme + Limit Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish light + dark themes with a Claude-feel warm palette and add edge-triggered animations (confetti / shake / edge-flash) when daily macros cross thresholds.

**Architecture:** A single `.dark` class on `<html>` toggles two CSS-variable sets (`--bg`, `--surface`, `--surface-2`, `--border`, `--fg`, `--muted`, `--accent`, etc.). Tailwind v4's `@theme` block exposes these as `bg-*`/`border-*`/`text-*` utilities. Theme mode resolves from `tg.colorScheme` first, then `prefers-color-scheme`, with live update via Telegram's `themeChanged` event. A new runes store `macroCrossings` persists per-day `under|hit|over` flags; `DailyTotals.svelte` and `CategoryCard.svelte` watch their respective state and fire `burstConfetti`, `shakeWarning`, `pulseWarning`, or `flashEdge` (whole-screen, first-of-day) only on the actual transition.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind v4, Vite, `motion` (already installed), `canvas-confetti` (new dep). No test runner — verification gates are `command pnpm run check`, `command pnpm run lint`, `command pnpm run build`, plus manual Chrome DevTools viewport pass in Task 12.

**Spec:** `docs/superpowers/specs/2026-04-28-light-theme-and-limit-animations-design.md`

---

## File map

| File                                           | Action | Responsibility                                                                                                                      |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/theme.ts`                             | create | Resolve + apply light/dark mode (`tg.colorScheme` → `prefers-color-scheme`)                                                         |
| `src/types/telegram.ts`                        | modify | Extend `TelegramWebApp` with `colorScheme` and optional `onEvent`                                                                   |
| `src/main.ts`                                  | modify | Call `applyThemeMode`; subscribe to `themeChanged` + media-query change; call `macroCrossings.pruneOlderThan(7)` after profile load |
| `src/app.css`                                  | modify | New `:root` light tokens + `.dark` overrides; rewrite `@theme` to bind to semantic vars                                             |
| `src/lib/anim.ts`                              | extend | Add `getCSSVar`, `shakeWarning`, `burstConfetti`, `flashEdge`; bump `pulseWarning` strength                                         |
| `src/state/macroCrossings.svelte.ts`           | create | Per-day `under` / `hit` / `over` flags for kcal/protein/carbs/fat + per-category over flags; persist in `storage`                   |
| `src/components/DateStrip.svelte`              | modify | Token sweep                                                                                                                         |
| `src/components/BottomNav.svelte`              | modify | Token sweep                                                                                                                         |
| `src/components/SideNav.svelte`                | modify | Token sweep                                                                                                                         |
| `src/components/EntrySheet.svelte`             | modify | Token sweep                                                                                                                         |
| `src/components/TelegramUserHeader.svelte`     | modify | Token sweep                                                                                                                         |
| `src/components/ProfileForm.svelte`            | modify | Token sweep + Claude-feel input restyle (focus ring)                                                                                |
| `src/components/AmountInput.svelte`            | modify | Token sweep + input restyle                                                                                                         |
| `src/components/CategoryCard.svelte`           | modify | Token sweep + edge-triggered `pulseWarning` via crossings store                                                                     |
| `src/components/DailyTotals.svelte`            | modify | Token sweep + crossings effect firing `burstConfetti`/`shakeWarning`/`flashEdge`                                                    |
| `src/components/CategoryBarChart.svelte`       | modify | Token sweep                                                                                                                         |
| `src/components/Heatmap.svelte`                | modify | Token sweep                                                                                                                         |
| `src/components/JournalRow.svelte`             | modify | Token sweep                                                                                                                         |
| `src/components/onboarding/StepConfirm.svelte` | modify | Token sweep                                                                                                                         |
| `src/components/onboarding/StepWelcome.svelte` | modify | Token sweep (keep `bg-white` on the logo disc)                                                                                      |
| `src/routes/Profile.svelte`                    | modify | Token sweep                                                                                                                         |
| `src/routes/Activity.svelte`                   | modify | Token sweep                                                                                                                         |
| `src/routes/Journal.svelte`                    | modify | Token sweep                                                                                                                         |
| `package.json`                                 | modify | Add `canvas-confetti` + `@types/canvas-confetti`                                                                                    |

`src/lib/storage/*`, `src/lib/macros.ts`, `src/lib/scaling.ts`, `src/lib/date.ts`, `src/state/profile.svelte.ts`, `src/state/activeDate.svelte.ts`, `src/state/dailyLog.svelte.ts`, `src/state/activity.svelte.ts`, `src/state/personalizedDb.ts` — untouched.

---

## Conventions used by every task

- **Pnpm only.** Always invoke as `command pnpm` (the bare wrapper is unreliable in this sandbox).
- **Verification gate before commit:** `command pnpm run check && command pnpm run lint`. Both exit 0.
- **Pre-commit hooks** run `prettier --write` + `svelte-check`. If GPG signing fails inside the sandbox, retry the same `git commit` invocation with `dangerouslyDisableSandbox: true` on the Bash tool.
- Class strings post-prettier may be re-ordered alphabetically — that's fine as long as the required tokens are all present.
- Match commit style of recent history: `feat(ui):`, `fix(ui):`, `refactor:`, `chore(ui):`, `chore(deps):`.

---

### Task 1: Add `canvas-confetti` dependency

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install runtime + types**

```bash
command pnpm add canvas-confetti
command pnpm add -D @types/canvas-confetti
```

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 errors, 0 warnings. (No code changes yet, but the install succeeded if both pass.)

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add canvas-confetti for celebration bursts"
```

---

### Task 2: Theme detection + types extension + main.ts wiring

**Files:**

- Create: `src/lib/theme.ts`
- Modify: `src/types/telegram.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create `src/lib/theme.ts`**

```ts
export type ThemeMode = 'light' | 'dark';

export function resolveThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const tg = window.Telegram?.WebApp;
  if (tg?.colorScheme === 'light' || tg?.colorScheme === 'dark') {
    return tg.colorScheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}
```

- [ ] **Step 2: Extend `TelegramWebApp` in `src/types/telegram.ts`**

In the `TelegramWebApp` interface, add two members:

```ts
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  ready(): void;
  expand(): void;
  themeParams: TelegramThemeParams;
  colorScheme: 'light' | 'dark';
  CloudStorage: TelegramCloudStorage;
  disableVerticalSwipes?(): void;
  onEvent?(name: string, callback: () => void): void;
}
```

(Diff vs current: `colorScheme: 'light' | 'dark'` and `onEvent?(...)` added; everything else unchanged.)

- [ ] **Step 3: Wire `applyThemeMode` in `src/main.ts`**

Replace the existing `main.ts` with:

```ts
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { applyThemeMode, resolveThemeMode } from '$lib/theme';

function applyTelegramTheme(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
  const t = tg.themeParams;
  const root = document.documentElement.style;
  if (t.bg_color) root.setProperty('--tg-bg', t.bg_color);
  if (t.text_color) root.setProperty('--tg-fg', t.text_color);
  if (t.hint_color) root.setProperty('--tg-hint', t.hint_color);
  if (t.link_color) root.setProperty('--tg-link', t.link_color);
}

function watchThemeMode(): void {
  applyThemeMode(resolveThemeMode());

  const tg = window.Telegram?.WebApp;
  tg?.onEvent?.('themeChanged', () => applyThemeMode(resolveThemeMode()));

  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => applyThemeMode(resolveThemeMode()));
  }
}

applyTelegramTheme();
watchThemeMode();

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element in index.html');

mount(App, { target });
```

(Diff vs current: imports `applyThemeMode` + `resolveThemeMode`; new `watchThemeMode()` function; called once after `applyTelegramTheme()`.)

- [ ] **Step 4: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/types/telegram.ts src/main.ts
git commit -m "feat(theme): detect tg colorScheme and apply .dark class on html"
```

After this commit, `<html>` carries a `.dark` class in dark mode but no colors change yet (Task 3 introduces the variables).

---

### Task 3: CSS token palette + Tailwind theme mapping

**Files:** `src/app.css`

- [ ] **Step 1: Replace the head of `src/app.css`**

Open `src/app.css`. Find the existing block:

```css
@import 'tailwindcss';

@theme {
  --color-bg: var(--tg-bg, #0f1115);
  --color-fg: var(--tg-fg, #e7e9ee);
  --color-muted: var(--tg-hint, #8a8f99);
  --color-accent: var(--tg-link, #4caf50);
  --color-danger: #ef4444;
  --color-warn: #f59e0b;
  --color-ok: #4caf50;
}
```

Replace that whole block with:

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* Light — Claude warm cream */
  --bg: #faf7f2;
  --surface: #ffffff;
  --surface-2: #f3eee5;
  --border: #e6dfd1;
  --border-strong: #c8bda5;
  --fg: #1f1d1a;
  --muted: #6b665d;
  --accent: var(--tg-link, #c96442);
  --on-accent: #ffffff;
  --danger: #c14a3a;
  --warn: #b8862a;
  --ok: #4a7a3a;
}

.dark {
  /* Dark — warm dim */
  --bg: #1a1816;
  --surface: #242120;
  --surface-2: #2d2927;
  --border: #3a3633;
  --border-strong: #524c47;
  --fg: #ece8e2;
  --muted: #9a938a;
  --accent: var(--tg-link, #d97757);
  --on-accent: #ffffff;
  --danger: #e26b5c;
  --warn: #d4a040;
  --ok: #6fa55b;
}

@theme {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-on-accent: var(--on-accent);
  --color-danger: var(--danger);
  --color-warn: var(--warn);
  --color-ok: var(--ok);
}
```

(`@custom-variant dark` — Tailwind v4 idiom that defines a `dark:` variant matching `.dark` on the element OR any ancestor. Lets components write `dark:...` if needed, though most styling uses semantic tokens that already flip.)

The rest of `src/app.css` (the `:root { color-scheme: light dark; }`, `html, body` block from the mobile-fix work, and the `input[type='range']` slider rules) stays unchanged.

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

Expected: check + lint clean, build succeeds. `dist/assets/index-*.css` should be slightly larger because it now ships both palettes.

At this point the app will look noticeably different in dark mode (warm tones) and broken in light mode (because component-level `border-white/10` / `bg-white/5` etc. still exist). Tasks 4–7 fix that.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "feat(theme): introduce light/dark token palette and rebind Tailwind theme"
```

---

### Task 4: Component sweep — chrome (DateStrip, BottomNav, SideNav, EntrySheet, TelegramUserHeader)

**Files:**

- `src/components/DateStrip.svelte`
- `src/components/BottomNav.svelte`
- `src/components/SideNav.svelte`
- `src/components/EntrySheet.svelte`
- `src/components/TelegramUserHeader.svelte`

The replacement rules are:

| Before                                                     | After            |
| ---------------------------------------------------------- | ---------------- |
| `border-white/10`, `border-white/5`                        | `border-border`  |
| `bg-white/5`, `bg-white/10`, `bg-white/2`                  | `bg-surface-2`   |
| `bg-transparent` (when used as a panel/input fill)         | `bg-surface`     |
| `text-white` (only on accent buttons / active radio chips) | `text-on-accent` |
| `bg-black/50` (true overlay)                               | unchanged        |

- [ ] **Step 1: `src/components/DateStrip.svelte`**

In the day-row container, change `border-b border-white/10` to `border-b border-border`. In the prev/next buttons, change `hover:bg-white/5` to `hover:bg-surface-2`. The currently-active day cell stays `bg-accent text-on-accent` (was `bg-accent text-white`); other cells stay color-only.

Specific edits:

```svelte
<div
  class="flex items-center gap-1 border-b border-border px-2 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:px-4"
>
```

```svelte
<button
  type="button"
  class="text-muted min-h-10 rounded px-3 py-2 text-base hover:bg-surface-2"
  ...
>
```

In the active-cell class array:

```svelte
activeDate.value === key ? 'bg-accent text-on-accent' : key === today ? 'text-fg font-bold' :
'text-muted',
```

(`text-white` → `text-on-accent`.)

- [ ] **Step 2: `src/components/BottomNav.svelte`**

Replace `border-t border-white/10` with `border-t border-border`. The active pill's `bg-accent/15` stays — it's a colour-mix that works in both modes.

```svelte
<nav
  class="bg-bg flex shrink-0 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden"
  aria-label="Головна навігація"
>
```

The icon-pill `<span>` already uses `bg-accent/15` (Task 5 of the previous plan) — no change.

- [ ] **Step 3: `src/components/SideNav.svelte`**

Replace `border-r border-white/10` with `border-r border-border`. Keep the logo disc as `bg-white` (the logo asset is designed for white). Active row keeps `bg-white/5`? — replace with `bg-surface-2`. Inactive hover replaces `hover:bg-white/5` with `hover:bg-surface-2`.

```svelte
<nav
  class="border-border hidden h-full w-56 shrink-0 flex-col gap-1 border-r p-4 md:flex"
  aria-label="Головна навігація"
>
  <div class="mb-4 flex items-center gap-2 px-2">
    <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
      <img src="/logo.png" alt="" class="h-8 w-auto object-contain" />
    </div>
    <h1 class="text-accent text-lg font-semibold">Calorie</h1>
  </div>
  {#each NAV_ITEMS as item (item.key)}
    {@const Icon = item.icon}
    <button
      type="button"
      class={[
        'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
        activeRoute.value === item.key
          ? 'text-accent border-accent bg-surface-2'
          : 'text-muted hover:bg-surface-2 border-transparent',
      ]}
      aria-current={activeRoute.value === item.key ? 'page' : undefined}
      onclick={() => activeRoute.set(item.key)}
    >
      <Icon size={18} />
      {item.label}
    </button>
  {/each}
</nav>
```

(Diff: `border-white/10` → `border-border`; `bg-white/5` → `bg-surface-2`; `hover:bg-white/5` → `hover:bg-surface-2`; logo disc `bg-white` kept.)

- [ ] **Step 4: `src/components/EntrySheet.svelte`**

Replace `bg-bg ... border-t border-white/10` and `md:border` (which inherits `border-white/10` from elsewhere — verify):

The `<div use:melt={$content}>` class line:

```svelte
class="bg-surface fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-auto overscroll-contain
rounded-t-2xl border-t border-border p-4 md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-md
md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-border"
```

(Diff: `bg-bg` → `bg-surface`; `border-t border-white/10` → `border-t border-border`; bare `md:border` becomes `md:border md:border-border` for the desktop variant.)

The list-item `<li>` rows: `border border-white/10` → `border border-border`.

The close button `text-muted` stays.

- [ ] **Step 5: `src/components/TelegramUserHeader.svelte`**

The avatar wrapper currently uses `bg-white/5`. Replace with `bg-surface-2`:

```svelte
<div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-surface-2">
```

Everything else unchanged.

- [ ] **Step 6: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/components/DateStrip.svelte src/components/BottomNav.svelte src/components/SideNav.svelte src/components/EntrySheet.svelte src/components/TelegramUserHeader.svelte
git commit -m "refactor(ui): chrome components use semantic theme tokens"
```

---

### Task 5: Component sweep — forms (ProfileForm + AmountInput, with Claude-feel inputs)

**Files:**

- `src/components/ProfileForm.svelte`
- `src/components/AmountInput.svelte`

- [ ] **Step 1: ProfileForm — restyle every numeric input**

Each of the three numeric inputs (height, weight, age) currently has:

```svelte
class="text-fg rounded-lg border border-white/10 bg-transparent px-4 py-4 text-lg"
```

Change to:

```svelte
class="text-fg rounded-lg border border-border bg-surface px-4 py-4 text-lg focus:border-accent
focus:ring-2 focus:ring-accent/20 focus:outline-none"
```

Apply this exact replacement to all three numeric input class strings. Keep the `inputmode`, `enterkeyhint`, `autocomplete`, `min`, `max`, `step`, `bind:value` attributes from the previous Task 9 work.

- [ ] **Step 2: ProfileForm — gender + activity radio chips**

The gender chip class array currently is:

```svelte
class={[
  'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-white/10 px-4 py-4 text-lg transition-colors',
  gender === 'female' && 'bg-accent border-accent text-white',
]}
```

Change to:

```svelte
class={[
  'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 py-4 text-lg transition-colors',
  gender === 'female' && 'bg-accent border-accent text-on-accent',
]}
```

Apply the analogous change to the male chip (replace `gender === 'female'` with `gender === 'male'`).

The activity chips:

```svelte
class={[
  'flex min-h-14 cursor-pointer items-center justify-center rounded-lg border border-white/10 px-3 py-4 text-center text-base transition-colors',
  activity === opt.value && 'bg-accent border-accent text-white',
]}
```

Change to:

```svelte
class={[
  'flex min-h-14 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-3 py-4 text-center text-base transition-colors',
  activity === opt.value && 'bg-accent border-accent text-on-accent',
]}
```

- [ ] **Step 3: ProfileForm — submit button**

Currently:

```svelte
class="bg-accent mt-4 min-h-14 rounded-lg px-6 py-4 text-lg font-semibold text-white shadow-md
shadow-black/20 transition-opacity disabled:opacity-50"
```

Change `text-white` to `text-on-accent`. `shadow-black/20` stays (works in both modes — black-with-alpha shadow always reads).

- [ ] **Step 4: AmountInput — read its current state, then restyle**

`src/components/AmountInput.svelte` likely uses a slider + a numeric stepper. Audit any `border-white/10`, `bg-white/5`, `bg-white/2`, `bg-transparent` (on inputs) per the same rules as Step 1. Map:

- `border-white/10` → `border-border`
- `bg-white/5` / `bg-white/10` / `bg-white/2` → `bg-surface-2`
- `bg-transparent` on the numeric input → `bg-surface`
- On any focusable input, add `focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none`

- [ ] **Step 5: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProfileForm.svelte src/components/AmountInput.svelte
git commit -m "feat(ui): forms get Claude-feel borders, surface fill, accent focus ring"
```

---

### Task 6: Component sweep — cards (CategoryCard, DailyTotals, CategoryBarChart, Heatmap, JournalRow)

**Files:**

- `src/components/CategoryCard.svelte`
- `src/components/DailyTotals.svelte`
- `src/components/CategoryBarChart.svelte`
- `src/components/Heatmap.svelte`
- `src/components/JournalRow.svelte`

For each file, apply the same replacement rules:

| Before                                    | After                                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `border-white/10`, `border-white/5`       | `border-border`                                                                                                 |
| `bg-white/5`, `bg-white/10`, `bg-white/2` | `bg-surface-2`                                                                                                  |
| `text-white` on accent buttons            | `text-on-accent`                                                                                                |
| Other tints (`bg-danger text-white` etc.) | keep as-is unless the danger button literally said `text-white` — replace with `text-on-accent` for consistency |

- [ ] **Step 1: `src/components/CategoryCard.svelte`**

Replace any `border-white/10` with `border-border`. The progress-bar background (`bg-white/10` or similar) → `bg-surface-2`. Do NOT touch the `pulseWarning` trigger logic — that's Task 11's job.

- [ ] **Step 2: `src/components/DailyTotals.svelte`**

Replace any `border-white/10` with `border-border`. Bar containers' background → `bg-surface-2`. No animation changes here yet — Task 10 adds those.

- [ ] **Step 3: `src/components/CategoryBarChart.svelte`**

```svelte
<div class="rounded-md border border-white/10 p-3">
```

→

```svelte
<div class="rounded-md border border-border p-3">
```

The selectable chip:

```svelte
'rounded-md border border-white/10 px-2 py-1 text-xs', selected === key && 'bg-accent text-white',
```

→

```svelte
'rounded-md border border-border px-2 py-1 text-xs', selected === key && 'bg-accent text-on-accent',
```

- [ ] **Step 4: `src/components/Heatmap.svelte`**

```svelte
<div class="rounded-md border border-white/10 p-3">
```

→

```svelte
<div class="rounded-md border border-border p-3">
```

If the heatmap cells use opacity-stepped tints (e.g., `bg-accent/10`, `bg-accent/30`, ...), keep them — those work in both modes because `--accent` flips automatically.

- [ ] **Step 5: `src/components/JournalRow.svelte`**

Replace `border-white/5` and `border-white/10` with `border-border`. The danger button class:

```svelte
class="bg-danger flex min-h-10 min-w-10 items-center justify-center rounded-md px-2 text-white"
```

→

```svelte
class="bg-danger flex min-h-10 min-w-10 items-center justify-center rounded-md px-2 text-on-accent"
```

(The danger pill historically uses white text — `text-on-accent` keeps that on both modes.)

- [ ] **Step 6: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/components/CategoryCard.svelte src/components/DailyTotals.svelte src/components/CategoryBarChart.svelte src/components/Heatmap.svelte src/components/JournalRow.svelte
git commit -m "refactor(ui): card and chart components use semantic theme tokens"
```

---

### Task 7: Component sweep — routes + onboarding

**Files:**

- `src/routes/Profile.svelte`
- `src/routes/Activity.svelte`
- `src/routes/Journal.svelte`
- `src/components/onboarding/StepConfirm.svelte`
- `src/components/onboarding/StepWelcome.svelte`

- [ ] **Step 1: `src/routes/Profile.svelte` — targets card border**

The targets grid currently:

```svelte
class="mb-5 grid grid-cols-4 gap-2 rounded-lg border border-white/10 p-3 text-center"
```

Change to:

```svelte
class="mb-5 grid grid-cols-4 gap-2 rounded-lg border border-border bg-surface p-3 text-center"
```

(Added `bg-surface` so the targets card has a fill that reads in light mode.)

- [ ] **Step 2: `src/routes/Activity.svelte` — multiple chunks**

Original (line 22, 35, 41, 63, 71):

```svelte
<div class="rounded-xl border border-white/10 bg-white/2 p-5">
```

→

```svelte
<div class="rounded-xl border border-border bg-surface-2 p-5">
```

The numeric input on line 35:

```svelte
class="text-fg w-32 rounded-lg border border-white/10 bg-transparent px-4 py-3 text-2xl font-bold
tabular-nums"
```

→

```svelte
class="text-fg w-32 rounded-lg border border-border bg-surface px-4 py-3 text-2xl font-bold
tabular-nums focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
```

Progress-bar track (line 41):

```svelte
<div class="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
```

→

```svelte
<div class="mt-4 h-3 w-full overflow-hidden rounded-full bg-surface-2">
```

Strength toggle inactive class (line 63):

```svelte
'border-white/10 bg-white/2 hover:bg-white/5',
```

→

```svelte
'border-border bg-surface-2 hover:bg-surface',
```

(Hover slightly inverts to draw attention.)

Strength toggle active state on line 71:

```svelte
activity.value.strength ? 'bg-ok text-white' : 'text-muted bg-white/5',
```

→

```svelte
activity.value.strength ? 'bg-ok text-on-accent' : 'text-muted bg-surface-2',
```

- [ ] **Step 3: `src/routes/Journal.svelte`**

Line 36:

```svelte
<ul class="flex flex-col rounded-md border border-white/10 bg-white/2">
```

→

```svelte
<ul class="flex flex-col rounded-md border border-border bg-surface-2">
```

- [ ] **Step 4: `src/components/onboarding/StepConfirm.svelte`**

Line 27:

```svelte
<p class="rounded-md border border-white/10 p-3 text-sm">
```

→

```svelte
<p class="rounded-md border border-border bg-surface p-3 text-sm">
```

Back button line 33:

```svelte
class="min-h-14 rounded-lg border border-white/10 px-6 py-4 text-base"
```

→

```svelte
class="min-h-14 rounded-lg border border-border bg-surface px-6 py-4 text-base"
```

Forward (accent) button line 40:

```svelte
class="bg-accent min-h-14 flex-1 rounded-lg px-6 py-4 text-lg font-semibold text-white shadow-md
shadow-black/20"
```

→

```svelte
class="bg-accent min-h-14 flex-1 rounded-lg px-6 py-4 text-lg font-semibold text-on-accent shadow-md
shadow-black/20"
```

- [ ] **Step 5: `src/components/onboarding/StepWelcome.svelte`**

Line 10 (logo disc) — keep `bg-white` (the logo is designed for white):

```svelte
class="flex h-46 w-46 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg
shadow-black/30"
```

(No change.)

Line 21 (CTA button):

```svelte
class="bg-accent mt-4 min-h-14 self-center rounded-lg px-8 py-4 text-lg font-semibold text-white
shadow-md shadow-black/20"
```

→

```svelte
class="bg-accent mt-4 min-h-14 self-center rounded-lg px-8 py-4 text-lg font-semibold text-on-accent
shadow-md shadow-black/20"
```

- [ ] **Step 6: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 errors, 0 warnings. After this task, the component sweep is complete and the app should look correct in both light and dark.

- [ ] **Step 7: Commit**

```bash
git add src/routes/Profile.svelte src/routes/Activity.svelte src/routes/Journal.svelte src/components/onboarding/StepConfirm.svelte src/components/onboarding/StepWelcome.svelte
git commit -m "refactor(ui): routes and onboarding use semantic theme tokens"
```

---

### Task 8: Animation helpers — `getCSSVar`, `shakeWarning`, `burstConfetti`, `flashEdge`

**Files:** `src/lib/anim.ts`

- [ ] **Step 1: Replace the contents of `src/lib/anim.ts`**

```ts
import { animate } from 'motion';
import confetti from 'canvas-confetti';

function getCSSVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function pulseSuccess(el: HTMLElement): void {
  if (reducedMotion()) return;
  void animate(el, { scale: [1, 1.04, 1] }, { duration: 0.35, ease: 'easeOut' });
}

export function pulseWarning(el: HTMLElement): void {
  if (reducedMotion()) return;
  void animate(
    el,
    {
      scale: [1, 1.03, 1],
      boxShadow: [
        '0 0 0 0 rgba(239,68,68,0)',
        '0 0 0 8px rgba(239,68,68,0.45)',
        '0 0 0 0 rgba(239,68,68,0)',
      ],
    },
    { duration: 0.7, ease: 'easeOut' },
  );
}

export function celebrate(el: HTMLElement): void {
  if (reducedMotion()) return;
  void animate(
    el,
    {
      scale: [1, 1.06, 1],
      boxShadow: [
        '0 0 0 0 rgba(76,175,80,0)',
        '0 0 0 12px rgba(76,175,80,0.35)',
        '0 0 0 0 rgba(76,175,80,0)',
      ],
    },
    { duration: 0.7, ease: 'easeOut' },
  );
}

export function shakeWarning(el: HTMLElement): void {
  if (reducedMotion()) return;
  void animate(el, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.45, ease: 'easeOut' });
  void animate(
    el,
    {
      boxShadow: [
        '0 0 0 0 rgba(193,74,58,0)',
        '0 0 0 8px rgba(193,74,58,0.4)',
        '0 0 0 0 rgba(193,74,58,0)',
      ],
    },
    { duration: 0.6, ease: 'easeOut' },
  );
}

export function burstConfetti(originEl: HTMLElement): void {
  const rect = originEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const x = Math.min(1, Math.max(0, (rect.right - 12) / window.innerWidth));
  const y = Math.min(1, Math.max(0, (rect.top + rect.height / 2) / window.innerHeight));
  void confetti({
    particleCount: 12,
    spread: 35,
    startVelocity: 25,
    decay: 0.92,
    ticks: 80,
    origin: { x, y },
    colors: [
      getCSSVar('--accent') || '#c96442',
      getCSSVar('--ok') || '#4a7a3a',
      getCSSVar('--warn') || '#b8862a',
    ],
    disableForReducedMotion: true,
  });
}

export function flashEdge(el: HTMLElement): void {
  if (reducedMotion()) return;
  const accent = (getCSSVar('--accent') || '#c96442') + '66';
  void animate(
    el,
    {
      boxShadow: [
        'inset 0 0 0 0 rgba(0,0,0,0)',
        `inset 0 0 0 4px ${accent}`,
        'inset 0 0 0 0 rgba(0,0,0,0)',
      ],
    },
    { duration: 0.5, ease: 'easeOut' },
  );
}
```

(Diff vs current file: existing `pulseSuccess`, `pulseWarning`, `celebrate` kept. `pulseWarning` boxShadow alpha bumped 0.35→0.45 + radius 6px→8px + duration 0.5s→0.7s. New helpers: `shakeWarning`, `burstConfetti`, `flashEdge`, plus internal `getCSSVar` and `reducedMotion` utilities. All animation functions early-return when `prefers-reduced-motion: reduce`.)

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

Expected: check clean; lint clean; build succeeds with new bundle size delta around +10 kB raw / +4 kB gzip from `canvas-confetti`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/anim.ts
git commit -m "feat(anim): add shakeWarning, burstConfetti, flashEdge; honor reduced motion"
```

---

### Task 9: macroCrossings store + boot prune

**Files:**

- Create: `src/state/macroCrossings.svelte.ts`
- Modify: `src/main.ts` (call `pruneOlderThan(7)` after profile load — actually safer in `App.svelte`'s onMount; we'll do it there)
- Modify: `src/App.svelte` (call prune once in `onMount` alongside the existing `profile.load`)

- [ ] **Step 1: Create `src/state/macroCrossings.svelte.ts`**

```ts
import { storage } from '$lib/storage';
import { todayKey, addDays } from '$lib/date';

export type MacroState = 'under' | 'hit' | 'over';
export type Macro = 'kcal' | 'protein' | 'carbs' | 'fat';

interface DayCrossings {
  kcal: MacroState;
  protein: MacroState;
  carbs: MacroState;
  fat: MacroState;
  categories: Record<string, 'under' | 'over'>;
}

const KEY_PREFIX = 'crossings:';

function emptyDay(): DayCrossings {
  return {
    kcal: 'under',
    protein: 'under',
    carbs: 'under',
    fat: 'under',
    categories: {},
  };
}

let _byDate = $state<Record<string, DayCrossings>>({});

export const macroCrossings = {
  async load(this: void, date: string): Promise<void> {
    const stored = await storage.load<DayCrossings | null>(KEY_PREFIX + date, null);
    _byDate[date] = stored ?? emptyDay();
  },

  macroState(this: void, date: string, macro: Macro): MacroState {
    return _byDate[date]?.[macro] ?? 'under';
  },

  categoryState(this: void, date: string, key: string): 'under' | 'over' {
    return _byDate[date]?.categories[key] ?? 'under';
  },

  async setMacro(this: void, date: string, macro: Macro, next: MacroState): Promise<void> {
    const day = _byDate[date] ?? emptyDay();
    day[macro] = next;
    _byDate[date] = day;
    await storage.save(KEY_PREFIX + date, day);
  },

  async setCategory(this: void, date: string, key: string, next: 'under' | 'over'): Promise<void> {
    const day = _byDate[date] ?? emptyDay();
    day.categories[key] = next;
    _byDate[date] = day;
    await storage.save(KEY_PREFIX + date, day);
  },

  hasAnyCrossing(this: void, date: string): boolean {
    const day = _byDate[date];
    if (!day) return false;
    if (
      day.kcal !== 'under' ||
      day.protein !== 'under' ||
      day.carbs !== 'under' ||
      day.fat !== 'under'
    ) {
      return true;
    }
    return Object.values(day.categories).some((s) => s === 'over');
  },

  async pruneOlderThan(this: void, daysOld: number): Promise<void> {
    const cutoff = addDays(todayKey(), -daysOld);
    const keys = await storage.keys();
    for (const k of keys) {
      if (!k.startsWith(KEY_PREFIX)) continue;
      const date = k.slice(KEY_PREFIX.length);
      if (date < cutoff) await storage.remove(k);
    }
  },
};
```

- [ ] **Step 2: Wire prune + load in `src/App.svelte`**

In the `onMount` block of `src/App.svelte`, currently:

```ts
onMount(async () => {
  await profile.load();
  if (profile.hasProfile) {
    await Promise.all([dailyLog.load(activeDate.value), activity.load(activeDate.value)]);
  }
});
```

Change to:

```ts
onMount(async () => {
  await profile.load();
  if (profile.hasProfile) {
    await Promise.all([
      dailyLog.load(activeDate.value),
      activity.load(activeDate.value),
      macroCrossings.load(activeDate.value),
    ]);
    void macroCrossings.pruneOlderThan(7);
  }
});
```

Add the import at the top of the script:

```ts
import { macroCrossings } from '$state/macroCrossings.svelte';
```

Also extend the existing `$effect` that re-loads daily data on date change:

```ts
$effect(() => {
  if (!profile.hasProfile) return;
  const date = activeDate.value;
  void dailyLog.load(date);
  void activity.load(date);
  void macroCrossings.load(date);
});
```

- [ ] **Step 3: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/state/macroCrossings.svelte.ts src/App.svelte
git commit -m "feat(state): add macroCrossings store with per-day persistence and weekly prune"
```

---

### Task 10: DailyTotals integration — fire `burstConfetti`/`shakeWarning`/`flashEdge` on transition

**Files:** `src/components/DailyTotals.svelte`

This is the centerpiece of the animations work. Steps:

1. Compute current state per macro from the existing totals + targets.
2. Compare with stored crossing state.
3. On transition, fire the right helper and persist the new state.
4. If this transition is the _first crossing of the day_, also fire `flashEdge`.

The exact code depends on what `DailyTotals.svelte` looks like. Below is the intended logic; an engineer should adapt it to the existing structure.

- [ ] **Step 1: Read the current `DailyTotals.svelte`**

Run: `cat src/components/DailyTotals.svelte`. Identify:

- Where each macro bar element lives (we need an element ref per macro for animations to anchor to).
- How `consumed` and `target` are currently derived for each of `kcal`, `protein`, `carbs`, `fat`.

- [ ] **Step 2: Add element refs for the four bars**

In the script, add:

```ts
let kcalEl = $state<HTMLDivElement | undefined>(undefined);
let proteinEl = $state<HTMLDivElement | undefined>(undefined);
let carbsEl = $state<HTMLDivElement | undefined>(undefined);
let fatEl = $state<HTMLDivElement | undefined>(undefined);
```

Bind them on each macro's outermost `<div>` in the markup:

```svelte
<div bind:this={kcalEl} class="...">...</div>
<div bind:this={proteinEl} class="...">...</div>
<div bind:this={carbsEl} class="...">...</div>
<div bind:this={fatEl} class="...">...</div>
```

(Whatever the existing wrapper is for each macro bar.)

- [ ] **Step 3: Compute state and react to transitions**

Add (or extend) the script with these imports:

```ts
import { activeDate } from '$state/activeDate.svelte';
import { macroCrossings, type MacroState, type Macro } from '$state/macroCrossings.svelte';
import { burstConfetti, shakeWarning, flashEdge } from '$lib/anim';
```

Add a small helper to map a ratio to a state:

```ts
function kcalState(consumed: number, target: number): MacroState {
  if (target <= 0) return 'under';
  if (consumed > target * 1.05) return 'over';
  if (consumed >= target) return 'hit';
  return 'under';
}

function macroState(consumed: number, target: number): MacroState {
  if (target <= 0) return 'under';
  return consumed >= target ? 'hit' : 'under';
}
```

(Note: a 5% dead band on kcal so a single overshoot of one biscuit doesn't fire a shake. Protein/carbs/fat have no `over` state — they only go `under | hit`.)

Then add the transition effect. Assume `consumed` and `targets` are derived state already in the file (`consumed.kcal`, `targets.kcal`, etc.). If they're named differently, adjust:

```ts
const macros: { name: Macro; el: () => HTMLDivElement | undefined; state: () => MacroState }[] = [
  { name: 'kcal', el: () => kcalEl, state: () => kcalState(consumed.kcal, targets.kcal) },
  {
    name: 'protein',
    el: () => proteinEl,
    state: () => macroState(consumed.protein, targets.protein),
  },
  { name: 'carbs', el: () => carbsEl, state: () => macroState(consumed.carbs, targets.carbs) },
  { name: 'fat', el: () => fatEl, state: () => macroState(consumed.fat, targets.fat) },
];

$effect(() => {
  const date = activeDate.value;
  for (const m of macros) {
    const next = m.state();
    const prev = macroCrossings.macroState(date, m.name);
    if (next === prev) continue;

    const wasFirstCrossing = !macroCrossings.hasAnyCrossing(date);
    void macroCrossings.setMacro(date, m.name, next);

    const el = m.el();
    if (!el) continue;

    if (prev === 'under' && next === 'hit') {
      burstConfetti(el);
    } else if (m.name === 'kcal' && next === 'over') {
      shakeWarning(el);
    }
    // any → 'under' or non-firing transitions: silent

    if (wasFirstCrossing && next !== 'under') {
      const main = document.querySelector<HTMLElement>('main');
      if (main) flashEdge(main);
    }
  }
});
```

(If the existing component uses different prop names than `consumed.kcal` / `targets.kcal`, substitute the correct identifiers. The contract is: each macro has a current consumed value and a target value derived from `profile.value` + the day's log.)

- [ ] **Step 4: Verify**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

Expected: 0 / 0 / build OK.

- [ ] **Step 5: Manual smoke (optional but recommended for this task)**

```bash
command pnpm run dev
```

In Chrome:

- Add food until protein bar reaches 100% → expect confetti from bar's right edge.
- Add more food past kcal target (>105%) → expect kcal bar to shake + red glow.
- Reload → no animation re-fires.
- Delete entries to bring values below target → no animation; cross again later → fires.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/DailyTotals.svelte
git commit -m "feat(dashboard): edge-triggered confetti on macro hit, shake on kcal overshoot"
```

---

### Task 11: CategoryCard integration — debounced `pulseWarning` via `macroCrossings`

**Files:** `src/components/CategoryCard.svelte`

- [ ] **Step 1: Read current CategoryCard logic**

```bash
cat src/components/CategoryCard.svelte
```

Identify:

- The `consumed` value (likely a percentage or a derived "% of category target")
- The category key (likely passed as a prop named `key` / `categoryKey` / `id`)
- Where `pulseWarning` is currently called

- [ ] **Step 2: Replace the existing `pulseWarning` trigger with edge-detection**

The existing trigger likely fires whenever `consumed > 100` becomes true (or every render while it stays true). Replace with an `$effect` that compares against the persisted state:

```ts
import { activeDate } from '$state/activeDate.svelte';
import { macroCrossings } from '$state/macroCrossings.svelte';
import { pulseWarning } from '$lib/anim';

let cardEl = $state<HTMLElement | undefined>(undefined);

$effect(() => {
  const date = activeDate.value;
  const next: 'under' | 'over' = consumed > 100 ? 'over' : 'under';
  const prev = macroCrossings.categoryState(date, categoryKey);
  if (next === prev) return;

  void macroCrossings.setCategory(date, categoryKey, next);

  const el = cardEl;
  if (!el) return;
  if (prev === 'under' && next === 'over') pulseWarning(el);
  // 'over' → 'under': silent reset
});
```

(Replace `consumed` and `categoryKey` with the actual identifiers in the file. Bind `bind:this={cardEl}` to the card's outermost element, replacing any prior `formEl`-style ref the file may have used.)

If the file already had a `<svelte:effect>` or `$effect` that called `pulseWarning` on `consumed > 100` directly, REMOVE that — it's now subsumed by the new effect.

- [ ] **Step 3: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/CategoryCard.svelte
git commit -m "feat(dashboard): CategoryCard pulseWarning fires only on transition to over"
```

---

### Task 12: Manual verification on real viewports

This task contains no code changes. It runs the dev server and walks the spec's verification checklist. The dev server may stay up across the steps below.

**Files:** none.

- [ ] **Step 1: Start the dev server**

```bash
command pnpm run dev
```

Open the printed URL in Chrome.

- [ ] **Step 2: Configure DevTools device toolbar**

Add custom devices:

- iPhone 14 Pro Max — 430 × 932 (DPR 3)
- Galaxy S25 — 393 × 852 (DPR 3)
- iPhone SE (sanity) — 375 × 667 (DPR 2)

- [ ] **Step 3: Light-mode pass (use macOS / DevTools rendering tab → "Emulate CSS prefers-color-scheme: light")**

For each viewport, confirm:

- All inputs (height, weight, age, AmountInput numeric) have visible warm border + white surface fill.
- Focus an input → accent ring appears (`focus:ring-accent/20`).
- DateStrip cells, BottomNav, SideNav, EntrySheet all read against the cream `#faf7f2` page bg with visible borders.
- TelegramUserHeader avatar disc shows the logo on a warm tinted bg (`bg-surface-2`), not white-on-white.
- ProfileForm radio chips: inactive shows surface fill + border; active shows accent fill + white text.
- BottomNav active item: pill `bg-accent/15` reads as accent-tinted on a warm bg.
- SideNav active item (desktop ≥ md): `border-l-2 border-accent` + `bg-surface-2`.
- No element disappears against the bg.

- [ ] **Step 4: Dark-mode pass ("Emulate CSS prefers-color-scheme: dark")**

For each viewport, confirm:

- App reads as warm-dim (slight brown undertone vs cool grey before).
- Borders crisp without glare.
- All previously fixed mobile-fix work intact (sticky chrome, scroll region, profile dirty state).

- [ ] **Step 5: Live theme switching**

In DevTools → Rendering, toggle between light and dark. App should recolor instantly without reload (the `prefers-color-scheme` listener handles it).

- [ ] **Step 6: Animation pass (use a test profile)**

In dev, log entries from Dashboard until:

- Protein bar reaches 100% → expect confetti burst from the bar's right edge.
- Kcal bar exceeds target by >5% → expect bar shake + red glow.
- A category card crosses 100% → expect strengthened red `pulseWarning`.
- The first of the day's crossings should ALSO trigger a one-time accent edge-flash on `<main>`.

Reload the page mid-day → no animations replay.

Delete entries to bring values back under target → no replay; cross again → fires fresh.

Switch to a past day where macros were already over → no replay (per-day state).

- [ ] **Step 7: Reduced motion**

In DevTools → Rendering, set "Emulate CSS media feature prefers-reduced-motion: reduce". Repeat Step 6 — confetti, shake, flash, pulse should NOT fire. Recolor on theme switch should still work.

- [ ] **Step 8: Stop dev server, commit any QA-driven fixes**

```bash
# only if Steps 3–7 produced changes
git add -A
git commit -m "fix(ui): QA fixes from theme + animation verification"
```

---

## Self-review

**Spec coverage:**

| Spec section                                               | Task    |
| ---------------------------------------------------------- | ------- |
| Theme detection (theme.ts + types + main.ts)               | Task 2  |
| Token palette (light + dark CSS vars)                      | Task 3  |
| Tailwind theme mapping (`@theme`)                          | Task 3  |
| Component sweep — chrome                                   | Task 4  |
| Component sweep — forms + Claude inputs                    | Task 5  |
| Component sweep — cards                                    | Task 6  |
| Component sweep — routes/onboarding                        | Task 7  |
| Animation helpers (shakeWarning, burstConfetti, flashEdge) | Task 8  |
| Strengthened pulseWarning                                  | Task 8  |
| Reduced-motion guards                                      | Task 8  |
| `macroCrossings` store                                     | Task 9  |
| Boot prune + per-date load                                 | Task 9  |
| DailyTotals integration                                    | Task 10 |
| CategoryCard integration                                   | Task 11 |
| Manual verification                                        | Task 12 |

All sections covered.

**Placeholder scan:**

- "If the existing component uses different prop names …" in Task 10 Step 3 — this is a contextual instruction to the engineer, not a placeholder. The expected names (`consumed.kcal`, `targets.kcal`) are documented and the fallback rule ("substitute the correct identifiers") is clear. Acceptable.
- "Replace `consumed` and `categoryKey` with the actual identifiers" in Task 11 Step 2 — same shape; an engineer reading the file's current code will identify them in <30 seconds.
- No "TBD" / "TODO" / "fill in" markers anywhere.

**Type consistency:**

- `MacroState`, `Macro`, `DayCrossings` types defined once in Task 9, re-used (with `import { type MacroState, type Macro }`) in Task 10. Consistent.
- `macroCrossings` API: `load`, `macroState`, `categoryState`, `setMacro`, `setCategory`, `hasAnyCrossing`, `pruneOlderThan`. Each call site uses a name from this list.
- `getCSSVar`, `reducedMotion` are private to `anim.ts` (not exported). All public helpers (`pulseSuccess`, `pulseWarning`, `celebrate`, `shakeWarning`, `burstConfetti`, `flashEdge`) match call sites in Tasks 10, 11, and existing call sites in `Profile.svelte`, `EntrySheet.svelte`, `CategoryBarChart.svelte`.
- Token names (`bg-surface`, `bg-surface-2`, `border-border`, `border-border-strong`, `text-on-accent`) match between Task 3 (definition) and Tasks 4–7 (consumption).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-28-light-theme-and-limit-animations.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

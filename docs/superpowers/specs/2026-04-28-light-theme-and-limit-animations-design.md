# Light Theme + Limit Animations — Design

Date: 2026-04-28
Status: Approved (pending spec review)
Scope: Telegram mini app, both Telegram color schemes (light + dark), iPhone 14 PM / Galaxy S25 viewports.

## Goals

1. Make the app look polished and high-contrast in **both** Telegram light and dark themes (Claude.ai-style warm palette).
2. Detect theme mode from Telegram's `colorScheme`, falling back to `prefers-color-scheme` for browser dev mode. Live-update on `themeChanged`.
3. Replace ad-hoc `border-white/10` / `bg-white/5` etc. with semantic tokens (`border-border`, `bg-surface`, `bg-surface-2`) that flip with the theme.
4. Redesign inputs with visible borders, surface fill, and an accent focus ring.
5. Add edge-triggered animations on Daily macros: confetti when a macro hits 100%, shake on kcal overshoot. Strengthen the existing per-category pulseWarning.
6. Add a one-time-per-day screen-edge flash on the first macro crossing.

## Non-goals

- Manual theme toggle in Profile (Telegram's setting is authoritative; per-session only).
- New automated tests.
- Branding changes (logo, app name).
- Changing Telegram theme bridge in `main.ts` beyond what's necessary to call the new `applyThemeMode`.

## Approach

Hybrid palette: own designed warm-cream-light / warm-dim-dark color system, with `--accent` still tinted by Telegram's `--tg-link` so the app feels native to each user. Tailwind v4's `@theme` block points at the semantic CSS variables; a `.dark` class on `<html>` flips the variable values. Animations layer on top using the existing `motion` library plus a new `canvas-confetti` dependency for celebration bursts.

## Architecture

### Theme detection (`src/lib/theme.ts`, new)

```ts
export type ThemeMode = 'light' | 'dark';

export function resolveThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const tg = window.Telegram?.WebApp;
  if (tg?.colorScheme) return tg.colorScheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}
```

`src/main.ts` after `tg.expand()`:

```ts
applyThemeMode(resolveThemeMode());

tg?.onEvent?.('themeChanged', () => {
  applyThemeMode(resolveThemeMode());
});

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => applyThemeMode(resolveThemeMode()));
```

`src/types/telegram.ts` — extend `TelegramWebApp`:

```ts
export interface TelegramWebApp {
  // ...existing fields...
  colorScheme: 'light' | 'dark';
  onEvent?(name: string, callback: () => void): void;
}
```

### Token palette (`src/app.css`)

```css
:root {
  /* Light — warm cream */
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

The Telegram bridge in `main.ts` keeps setting `--tg-link` from `themeParams.link_color`, so `--accent` still flows from Telegram per user (just with a Claude-coral fallback for browser dev mode). The other Telegram tokens (`--tg-bg`, `--tg-fg`, `--tg-hint`) are no longer referenced by `--color-*` since we now own those — but the assignments stay in `main.ts` for any third-party CSS that might read them. (Verify nothing reads them; if not, drop those four lines.)

### Component sweep

A grep-and-replace audit converts ad-hoc tints to semantic tokens. Replacements:

| Before                                       | After                                |
| -------------------------------------------- | ------------------------------------ |
| `border-white/10`, `border-white/5`          | `border-border`                      |
| `bg-white/5`, `bg-white/10`                  | `bg-surface-2`                       |
| `bg-bg` (when used as a section bg)          | `bg-bg` (token now flips with theme) |
| `bg-transparent` on inputs                   | `bg-surface`                         |
| `text-white` on accent buttons / radio chips | `text-on-accent`                     |
| `bg-black/50` overlays                       | unchanged                            |

Files touched (verified by grep at implementation time):

- `src/components/DateStrip.svelte` — strip border + cell hover
- `src/components/BottomNav.svelte` — top border, accent pill background
- `src/components/SideNav.svelte` — right border, active row bg, accent left-border
- `src/components/EntrySheet.svelte` — sheet border + items
- `src/components/AmountInput.svelte` — slider track + input chrome
- `src/components/CategoryCard.svelte` — card border + bar background
- `src/components/DailyTotals.svelte` — bar containers
- `src/components/ProfileForm.svelte` — input borders + radio chips
- `src/components/TelegramUserHeader.svelte` — avatar bg
- `src/routes/Onboarding.svelte`
- `src/routes/Dashboard.svelte`, `Journal.svelte`, `Activity.svelte`, `Stats.svelte` — verify each

### Inputs (Claude-feel)

ProfileForm + AmountInput numeric inputs:

```
border border-border bg-surface text-fg
focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none
```

Replaces today's `border-white/10 bg-transparent`. Visible at rest; accent ring on focus. Same treatment for the gender radio chips and activity-level chips (their inactive state uses `border-border bg-surface`; active stays `bg-accent border-accent text-on-accent`).

### Animations

Library additions:

- Keep `motion` (already in deps).
- Add `canvas-confetti` (~10 kB gzip, framework-agnostic).

Helpers in `src/lib/anim.ts`:

```ts
export function shakeWarning(el: HTMLElement): void {
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
  const x = (rect.right - 12) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  void confetti({
    particleCount: 12,
    spread: 35,
    startVelocity: 25,
    decay: 0.92,
    ticks: 80,
    origin: { x, y },
    colors: [getCSSVar('--accent'), getCSSVar('--ok'), getCSSVar('--warn')],
    disableForReducedMotion: true,
  });
}

export function flashEdge(el: HTMLElement): void {
  void animate(
    el,
    {
      boxShadow: [
        'inset 0 0 0 0 rgba(0,0,0,0)',
        `inset 0 0 0 4px ${getCSSVar('--accent')}66`,
        'inset 0 0 0 0 rgba(0,0,0,0)',
      ],
    },
    { duration: 0.5, ease: 'easeOut' },
  );
}
```

(`getCSSVar` reads a computed CSS variable; small helper added to `anim.ts`.)

`pulseWarning` itself stays but the boxShadow alpha bumps from `0.35` → `0.45` and duration `0.5s` → `0.7s`.

### Crossing-edge debouncing

New runes store `src/state/macroCrossings.svelte.ts`:

```ts
import { storage } from '$lib/storage';
import { todayKey, addDays } from '$lib/date';

type MacroState = 'under' | 'hit' | 'over';
type Macro = 'kcal' | 'protein' | 'carbs' | 'fat';

interface DayCrossings {
  kcal: MacroState; // can be under | hit | over
  protein: MacroState; // can be under | hit (no 'over' — non-kcal exceeding is still "hit")
  carbs: MacroState; // same
  fat: MacroState; // same
  categories: Record<string, 'under' | 'over'>; // by category key, only "over" matters
}

const KEY_PREFIX = 'crossings:';
const initial: DayCrossings = {
  kcal: 'under',
  protein: 'under',
  carbs: 'under',
  fat: 'under',
  categories: {},
};

let _byDate = $state<Record<string, DayCrossings>>({});

export const macroCrossings = {
  async load(this: void, date: string): Promise<void> {
    const stored = await storage.load<DayCrossings | null>(KEY_PREFIX + date, null);
    _byDate[date] = stored ?? structuredClone(initial);
  },
  macroState(this: void, date: string, macro: Macro): MacroState {
    return _byDate[date]?.[macro] ?? 'under';
  },
  categoryState(this: void, date: string, key: string): 'under' | 'over' {
    return _byDate[date]?.categories[key] ?? 'under';
  },
  async setMacro(this: void, date: string, macro: Macro, next: MacroState): Promise<void> {
    const day = _byDate[date] ?? structuredClone(initial);
    day[macro] = next;
    _byDate[date] = day;
    await storage.save(KEY_PREFIX + date, day);
  },
  async setCategory(this: void, date: string, key: string, next: 'under' | 'over'): Promise<void> {
    const day = _byDate[date] ?? structuredClone(initial);
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
    )
      return true;
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

`storage.keys()` already exists on the `StorageDriver` interface (both Telegram and localforage drivers expose it).

`DailyTotals.svelte` computes the current state of each macro from `dailyTargets(profile.value)` and `sumMacros(...)`. State machine per macro:

- **kcal**: `consumed < target` → `under`; `target ≤ consumed ≤ target` → `hit`; `consumed > target` → `over`. (i.e., `hit` is the equality moment; once `>` it's `over`.) Practically: `under` if `< target`, `over` if `> 105%` (small dead band so a 1-kcal overshoot doesn't shake), `hit` otherwise.
- **protein/carbs/fat**: only `under` (`< target`) and `hit` (`≥ target`). No `over` state — exceeding these isn't a warning.

An `$effect` in `DailyTotals.svelte` compares the previous stored state with the new computed state. On transition:

| transition                     | macro     | animation              |
| ------------------------------ | --------- | ---------------------- |
| `under` → `hit`                | any       | `burstConfetti(barEl)` |
| `hit` → `over`                 | kcal only | `shakeWarning(barEl)`  |
| `under` → `over`               | kcal only | `shakeWarning(barEl)`  |
| any → `under`                  | any       | nothing (silent reset) |
| `hit` → `hit`, `over` → `over` | any       | nothing                |

After firing any non-noop animation, the effect calls `macroCrossings.setMacro(date, macro, next)` to persist. Then it checks: if `hasAnyCrossing(date)` was `false` _before_ the update and `true` _after_, additionally call `flashEdge(mainEl)`.

`CategoryCard.svelte`: edge-trigger via `macroCrossings.categoryState(date, item.key)`. When `consumed > 100` and previous state was `under`, fire strengthened `pulseWarning` and call `setCategory(date, item.key, 'over')`. When `consumed ≤ 100` and previous was `over`, silently reset to `under`.

Boot prune: `src/main.ts` (or where stores load) calls `macroCrossings.pruneOlderThan(7)` once at app start. Reduces localStorage clutter.

## Files touched

| File                                                           | Action                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/theme.ts`                                             | create                                                                 |
| `src/lib/anim.ts`                                              | extend (add `shakeWarning`, `burstConfetti`, `flashEdge`, `getCSSVar`) |
| `src/state/macroCrossings.svelte.ts`                           | create                                                                 |
| `src/types/telegram.ts`                                        | extend `TelegramWebApp` with `colorScheme`, `onEvent`                  |
| `src/main.ts`                                                  | call `applyThemeMode`, subscribe to `themeChanged` + media query       |
| `src/app.css`                                                  | replace `@theme` block; add light/dark variable sets                   |
| `src/App.svelte`                                               | expose `mainEl` to children that need `flashEdge` (already bound)      |
| `src/components/DateStrip.svelte`                              | swap white/black tints to semantic tokens                              |
| `src/components/BottomNav.svelte`                              | swap tints; accent pill uses `bg-accent/15` already                    |
| `src/components/SideNav.svelte`                                | swap tints                                                             |
| `src/components/EntrySheet.svelte`                             | swap tints                                                             |
| `src/components/AmountInput.svelte`                            | swap tints; input focus ring                                           |
| `src/components/CategoryCard.svelte`                           | swap tints; debounced `pulseWarning`                                   |
| `src/components/DailyTotals.svelte`                            | crossings effect; new animations                                       |
| `src/components/ProfileForm.svelte`                            | input + radio chip restyle (focus ring; light-mode-safe)               |
| `src/components/TelegramUserHeader.svelte`                     | avatar `bg-white/5` → `bg-surface-2`                                   |
| `src/routes/Onboarding.svelte`                                 | swap tints                                                             |
| `src/routes/Dashboard.svelte`                                  | bind `mainEl` reference if needed for `flashEdge` (alt: pass via prop) |
| `src/routes/Journal.svelte`, `Activity.svelte`, `Stats.svelte` | swap tints (pass)                                                      |
| `package.json`                                                 | add `canvas-confetti` and `@types/canvas-confetti`                     |

`src/lib/macros.ts`, `src/lib/scaling.ts`, data layer — untouched.

## Verification

Manual viewport tests in Chrome DevTools + `pnpm run dev`:

1. **Light mode (system or `tg.colorScheme === 'light'`):**
   - All inputs have visible borders against page background.
   - Focus state shows accent ring.
   - Cards (CategoryCard, DateStrip cells, BottomNav, SideNav) read clearly with warm cream surfaces.
   - Active nav indicators (pill, left-border) are unambiguous.
   - No element fades into the background.

2. **Dark mode:**
   - Slight warm tint vs current cool grey, but no regressions.
   - Borders visible without being too bright.
   - All previously-touched mobile-fix UI (sticky chrome, scroll-region, etc.) unchanged in behavior.

3. **Live theme switching:**
   - Flip Telegram theme → app recolors instantly; no reload.
   - In browser, change OS theme → app updates.

4. **Animations:**
   - Push protein/carbs/fat to 100% → confetti from bar's right edge, once.
   - Push kcal past 100% → bar shakes + red glow ring.
   - Push a category past 100% → red `pulseWarning` (existing, strengthened).
   - First crossing of the day → also a one-time accent-tinted edge flash on `<main>`.
   - Reload mid-day → no animations replay (state is persisted per day).
   - Delete entries to bring values below thresholds → no animation; cross again later → fires again.
   - Switch to a past date that was already over → no replay.
   - `prefers-reduced-motion: reduce` → confetti suppressed via `disableForReducedMotion: true`. Shake/pulse: also wrap them in a reduced-motion check (skip if reduced).

5. **Telegram-native:**
   - Real Telegram phone (Android + iOS): accent matches user's Telegram link color.
   - Light Telegram theme on iOS: app reads as Claude-warm-cream, not washed out.

6. **Build size:**
   - `canvas-confetti` adds ~10 kB gzip. Acceptable.

No new automated tests. `pnpm run check` + `pnpm run lint` + `pnpm run build` are the gate.

## Risks

- **Token sweep regressions in dark mode.** Replacing `border-white/10` with `border-border` may shift visual weight. Verify all touched components in dark mode during QA.
- **`canvas-confetti` overlay**: it injects a fixed canvas at z-index 100 by default. Confirm it doesn't overlap modals (EntrySheet at z-50). If it does, set `confetti.create(customCanvas)` with a managed canvas at z-index 60.
- **Crossing store explosion**: localStorage entries `crossings:YYYY-MM-DD` accumulate. Mitigated by `pruneOlderThan(7)` on boot.
- **`themeChanged` event support**: only available on Telegram WebApp 6.1+. Older clients won't live-update; the next page load picks up the right theme. Acceptable.
- **`prefers-reduced-motion`**: confetti library has built-in support; we add explicit checks for shake/pulse so users with motion sensitivity get a calm experience.

## Open follow-ups (not in scope, but worth tracking)

- A "subtle haptic" call via `tg.HapticFeedback.notificationOccurred('warning'|'success')` on crossings would pair nicely with the visuals on real phones. Could be added as a one-line additive change once the visual layer is settled.

# Calorie — Design Spec

**Date:** 2026-04-27
**Status:** Approved, ready for implementation planning
**Source HLD:** `req.txt` (root of repo)

## 1. Overview

Calorie is a Local-First mobile-first PWA / Telegram WebApp that helps a single
user track daily food intake against a category-based quota system (8 categories
А–Ж / A–H, each with a 100% daily limit expressed in grams or pieces per item).
The app is fully autonomous — there is no backend, no auth, no data export, no
trainer. All data lives on the user's device (Telegram CloudStorage when opened
inside Telegram; IndexedDB via localforage in any browser/PWA).

This spec adapts the original HLD in `req.txt` for:

- **TypeScript** (the HLD left this open).
- **Svelte 5 with runes** (the HLD pre-dates Svelte 5; reactive `$:` syntax is
  replaced by `$state` / `$derived` / `$effect`).
- **A few small ambiguities** the HLD left open, which were resolved during
  brainstorming and are documented inline below.

The full v1 scope is shipped in one iteration: onboarding + profile scaling,
dashboard, bottom-sheet entry, journal, stats (heatmap + bar chart), Telegram +
PWA support, GitHub Pages deploy.

## 2. Stack

- **Build:** Vite + TypeScript + Svelte 5 (runes).
- **Package manager:** `pnpm` exclusively (no `npm`, no `yarn`, no `package-lock.json`).
- **Styling:** Tailwind CSS + Telegram theme CSS vars (`var(--tg-theme-bg-color)`).
- **UI primitives:** Melt UI (headless Dialog used as bottom sheet, segmented controls).
- **Icons:** Lucide.
- **Charts:** `svelte-frappe-charts`.
- **Animation:** Svelte built-ins (`svelte/transition`, `svelte/animate`,
  `svelte/motion` Spring/Tween) + `motion` (Motion One, ~5KB) for accent
  animations on important moments. No other animation libraries.
- **Storage:** `localforage` (IndexedDB wrapper) + `window.Telegram.WebApp.CloudStorage`.
- **PWA:** `vite-plugin-pwa` with `generateSW` + `autoUpdate`.
- **Deploy:** GitHub Actions → GitHub Pages with custom domain `https://calorie.ordynski.com/` (CNAME in `public/`).
- **Lint:** ESLint v9 (flat config) + `typescript-eslint` + `eslint-plugin-svelte`
  (Svelte 5 aware) + `eslint-config-prettier` (disables stylistic rules that
  fight Prettier).
- **Format:** Prettier + `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`
  (auto-sorts class lists).
- **Type check:** `svelte-check` over the whole project (catches errors that
  span files, not just staged ones).
- **Git hooks:** `husky` v9 + `lint-staged` v15 — see §13.
- **No tests in v1.** TypeScript + `svelte-check` cover correctness; visual
  verification covers the rest. Vitest can be added later if state modules grow.

## 3. Project layout

```
calorie/
├─ index.html                # includes Telegram WebApp script tag
├─ vite.config.ts            # base: '/' (custom domain), VitePWA plugin
├─ tsconfig.json
├─ eslint.config.js          # flat config; TS + Svelte + Prettier
├─ .prettierrc               # Prettier + plugins
├─ .prettierignore
├─ .editorconfig
├─ package.json              # scripts + lint-staged config
├─ pnpm-lock.yaml
├─ .husky/
│  └─ pre-commit             # runs lint-staged + svelte-check
├─ public/
│  ├─ CNAME                  # custom domain: calorie.ordynski.com
│  └─ icons/                 # PWA icons 192/512
├─ src/
│  ├─ app.css                # Tailwind directives + Telegram theme vars
│  ├─ main.ts                # mount(App), Telegram init
│  ├─ App.svelte             # shell: onboarding gate, tab outlet, BottomNav
│  ├─ data/
│  │  └─ foodDb.json         # static, bundled (categories A–H)
│  ├─ types/
│  │  ├─ food.ts
│  │  ├─ log.ts
│  │  └─ profile.ts
│  ├─ lib/
│  │  ├─ storage/
│  │  │  ├─ index.ts         # singleton + runtime driver selection
│  │  │  ├─ telegram.ts      # CloudStorage driver
│  │  │  └─ local.ts         # localforage driver
│  │  ├─ scaling.ts          # Mifflin-St Jeor + k-factor + scaleFoodDb
│  │  ├─ date.ts             # YYYY-MM-DD helpers, week/month iteration
│  │  ├─ debounce.ts
│  │  └─ anim.ts             # pulseSuccess / pulseWarning / celebrate
│  ├─ state/                 # all .svelte.ts (runes modules)
│  │  ├─ profile.svelte.ts
│  │  ├─ activeDate.svelte.ts
│  │  ├─ dailyLog.svelte.ts
│  │  └─ personalizedDb.svelte.ts
│  ├─ routes/
│  │  ├─ Dashboard.svelte
│  │  ├─ Journal.svelte
│  │  ├─ Stats.svelte
│  │  └─ Onboarding.svelte
│  └─ components/
│     ├─ BottomNav.svelte         # mobile (<md)
│     ├─ SideNav.svelte           # desktop (md+)
│     ├─ DateStrip.svelte
│     ├─ CategoryCard.svelte
│     ├─ EntrySheet.svelte
│     ├─ AmountInput.svelte
│     ├─ JournalRow.svelte
│     ├─ Heatmap.svelte
│     └─ CategoryBarChart.svelte
└─ .github/workflows/deploy.yml
```

## 4. Data model

### 4.1 Static food database (`src/data/foodDb.json`)

Bundled with the app. Source data is the table in `req.txt §247`. Eight
categories A–H, each with `title`, `color`, and an `items` map keyed by short
ID (`a1`, `b3`, etc.). Each item has `name`, `max_g` (the value that equals
100% of the daily limit), and an optional `unit` (defaults to `"г"`; only
`b6` Eggs uses `"шт"` with `max_g: 6` meaning 6 pieces = 100%).

### 4.2 Types (`src/types/`)

```ts
// food.ts
export type CategoryKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export interface FoodItem {
  name: string;
  max_g: number;
  unit?: string;
}
export interface FoodCategory {
  title: string;
  color: string;
  items: Record<string, FoodItem>;
}
export type FoodDb = Record<CategoryKey, FoodCategory>;

// log.ts
export interface LogEntry {
  id: string; // foodDb item id, e.g. "a1"
  cat: CategoryKey;
  pct: number; // 0..N (soft cap, can exceed 100)
  ts: number; // Date.now() at creation
}

// profile.ts
export type Gender = 'male' | 'female';
export interface UserProfile {
  height: number; // cm
  weight: number; // kg
  gender: Gender;
  age: number;
  activity: number; // 1.2 | 1.375 | 1.55 | 1.725
  k_factor: number; // computed; never user-edited directly
  last_updated: string; // ISO timestamp
}
```

### 4.3 Persisted keys

- `user_profile` → `UserProfile` (one record).
- `log_YYYY-MM-DD` → `LogEntry[]` (one per day with entries).

Values are JSON-stringified before saving so the same wire format works in both
storage drivers and stays under Telegram's 4096-byte/key quota.

## 5. State (Svelte 5 runes modules)

State lives in `.svelte.ts` modules, not stores. No `writable`/`derived` from
`svelte/store`. Each module exports a frozen API object (getters + actions);
internal `$state` is private.

### 5.1 `state/profile.svelte.ts`

Holds `_profile: UserProfile | null` and `_loaded: boolean`.

Public API:

- `value` (getter) — current profile or null.
- `loaded` (getter) — has the initial load attempt completed?
- `hasProfile` (getter) — convenience for the onboarding gate.
- `load()` — read `user_profile` from storage.
- `save(input)` — accepts everything except `k_factor`/`last_updated`,
  computes `k_factor` via `computeKFactor`, stamps `last_updated`, persists.

### 5.2 `state/activeDate.svelte.ts`

Holds `_date: string` (YYYY-MM-DD), defaults to today. Setting it triggers
`dailyLog.load(date)` via an `$effect` in `App.svelte`.

### 5.3 `state/dailyLog.svelte.ts`

Holds `_entries: LogEntry[]` and `_date: string` for the currently loaded day.

Public API:

- `entries`, `date` (getters).
- `load(date)` — replaces `_entries` with the persisted log for `date`.
- `add(entry)` — appends with `ts: Date.now()`, schedules debounced save.
- `remove(ts)` — filters by ts, schedules debounced save.

Debounce window: 500ms. Implemented via `lib/debounce.ts`.

Module also exports a top-level derived value:

```ts
export const categoryConsumed = $derived.by(() => {
  const sums: Record<CategoryKey, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
  for (const e of dailyLog.entries) sums[e.cat] += e.pct;
  return sums;
});
```

(Top-level `$derived` is only legal in `.svelte.ts` modules; this is the reason
state modules carry that extension.)

### 5.4 `state/personalizedDb.svelte.ts`

Single source of truth for "how many grams = 100% for this user." Components
never read `foodDb.json` directly.

```ts
export const personalizedDb = $derived.by<FoodDb>(() => {
  const k = profile.value?.k_factor ?? 1.0;
  if (k === 1.0) return baseFoodDb as FoodDb;
  return scaleFoodDb(baseFoodDb as FoodDb, k);
});
```

### 5.5 Quota safety

`dailyLog`'s save path checks `JSON.stringify(_entries).length > 3800`; if
exceeded, surfaces a non-blocking warning toast. Telegram CloudStorage
rejects oversized values; localforage continues. Typical days are well under
budget — would need ~200 distinct items in one day to hit it.

## 6. Storage adapter (`src/lib/storage/`)

```ts
export interface StorageDriver {
  save<T>(key: string, value: T): Promise<void>;
  load<T>(key: string, fallback: T): Promise<T>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>; // used by Stats heatmap
}
```

Runtime selection:

```ts
const isTelegram = !!window.Telegram?.WebApp?.initData;
export const storage: StorageDriver = isTelegram ? new TelegramDriver() : new LocalforageDriver();
```

- `TelegramDriver` wraps `window.Telegram.WebApp.CloudStorage` (callback API
  promisified). `keys()` calls `getKeys()`.
- `LocalforageDriver` wraps `localforage` directly.

Both drivers JSON-stringify on save, JSON-parse on load. Same wire format on
both sides — switching storage layer doesn't change the data shape.

## 7. Scaling math (`src/lib/scaling.ts`)

Mifflin-St Jeor BMR × activity factor → TDEE. K-factor is the ratio of the
user's TDEE to a fixed baseline TDEE.

```ts
const BASELINE = { height: 168, weight: 74, gender: 'female', age: 30, activity: 1.2 };

function bmr({ height, weight, gender, age }: ProfileInput): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

function tdee(p: ProfileInput): number {
  return bmr(p) * p.activity;
}

export function computeKFactor(p: ProfileInput): number {
  const ratio = tdee(p) / tdee(BASELINE);
  return Math.round(Math.max(0.6, Math.min(1.6, ratio)) * 100) / 100;
}

export function scaleFoodDb(db: FoodDb, k: number): FoodDb {
  const out = structuredClone(db);
  for (const cat of Object.values(out)) {
    for (const item of Object.values(cat.items)) {
      // Pieces (unit 'шт') stay un-scaled — eggs are eggs.
      if ((item.unit ?? 'г') === 'г') {
        item.max_g = Math.round(item.max_g * k);
      }
    }
  }
  return out;
}
```

Two non-obvious decisions:

1. **K is clamped to [0.6, 1.6]** — protects against typos / unrealistic input.
2. **Pieces don't scale** — anything with `unit !== 'г'` keeps its original
   `max_g`. Today this only affects eggs; the rule is general.

## 8. UI

### 8.1 Shell (`App.svelte`) — mobile + desktop

The app is **mobile-first** but renders well on desktop. Layout switches at the
Tailwind `md` breakpoint (768px). Below `md` we use a single-column phone
layout with bottom nav. At `md` and up we promote nav to a sidebar and gain
horizontal room.

**Mobile (`<md`, default):**

```
┌─────────────────────────────┐
│ <DateStrip/>                │  (only on tabs, not onboarding)
├─────────────────────────────┤
│ {#if !profile.loaded}       │
│   <Splash/>                 │
│ {:else if !profile.hasProfile}
│   <Onboarding/>             │
│ {:else}                     │
│   <Tab content>             │  scrollable
│ {/if}                       │
├─────────────────────────────┤
│ <BottomNav/>                │  (hidden during onboarding)
└─────────────────────────────┘
```

**Desktop (`md+`):**

```
┌────────┬───────────────────────────────────────┐
│        │ <DateStrip/>                          │
│ <Side  ├───────────────────────────────────────┤
│  Nav/> │                                       │
│        │ <Tab content>                         │
│        │ (max-w-5xl, centered)                 │
│        │                                       │
└────────┴───────────────────────────────────────┘
```

`<BottomNav>` and `<SideNav>` are two thin wrappers around the same nav-item
list (Dashboard / Journal / Stats); only one renders at a time, controlled by
`md:hidden` / `hidden md:flex` Tailwind classes. Nav items use Lucide icons
and are labeled in Ukrainian.

Page content is constrained to `max-w-5xl mx-auto px-4 md:px-6` so the layout
doesn't stretch across an ultrawide monitor. Onboarding uses its own narrower
container (`max-w-md mx-auto`) to keep the wizard form-shaped on every viewport.

`currentTab = $state<'dashboard'|'journal'|'stats'>('dashboard')`. Switching
tabs toggles `display: none` rather than mounting/unmounting — preserves chart
state and scroll position on each tab.

### 8.2 Routing

No router library. Tab state is a single rune in `App.svelte`. Onboarding is a
top-level branch, not a route. URL hash is not used in v1.

### 8.3 Dashboard (`routes/Dashboard.svelte`)

Renders 8 `<CategoryCard>`s in a responsive grid:
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. On mobile cards stack
full-width; on tablets they pair up; on desktop all 8 categories fit in two
rows of four — the entire daily picture is visible without scrolling. Each card:

- Title (e.g. "Б — М'ясо, риба, яйця").
- Animated progress bar driven by a `Spring` rune (stiffness 0.15, damping 0.8).
- Status text: "Залишилось N%" if ≤100, "+N% over" in red if over.
- Click → opens `<EntrySheet>` for that category.

### 8.4 `<CategoryCard>`

Visual cap on the bar: 150% (so a +50% overage is still expressive without
distorting layout). When `consumed` crosses from <100 to ≥100, run
`pulseWarning` once. Soft-cap behavior: the card never blocks input.

### 8.5 `<EntrySheet>` (Melt UI Dialog — bottom sheet on mobile, centered modal on desktop)

Lists products of the active category from `personalizedDb`. Tapping a row
expands it inline to reveal `<AmountInput>` + an "Додати" button. On submit:
`dailyLog.add(...)` → `pulseSuccess` on the source card → close sheet.

**Responsive presentation** (single Melt UI Dialog instance, two style
variants via Tailwind classes):

- **Mobile (`<md`):** anchored to the bottom edge, full-width, slide-up
  transition, `max-h-[85vh]` with internal scroll.
- **Desktop (`md+`):** centered modal, `max-w-md`, scale-fade transition,
  backdrop dim. Same content, no layout fork.

### 8.6 `<AmountInput>` — 2-way percent ↔ amount binding

```svelte
<script lang="ts">
  let { item } = $props();
  let pct = $state(0);
  let amount = $state(0);
  const unit = item.unit ?? 'г';
  const isPieces = unit === 'шт';
  const step = isPieces ? 1 : 5;

  // Track which side was last edited to avoid oscillation.
  let lastEdited = $state<'pct' | 'amount'>('pct');
  $effect(() => {
    if (lastEdited === 'pct') {
      const a = (item.max_g * pct) / 100;
      amount = isPieces ? Math.round(a) : Math.round(a / step) * step;
    }
  });
  $effect(() => {
    if (lastEdited === 'amount') pct = (amount / item.max_g) * 100;
  });
</script>
```

The `lastEdited` flag breaks the loop the two `$effect`s would otherwise form.
This pattern is reused anywhere two values are bound to the same underlying quantity.

### 8.7 Journal (`routes/Journal.svelte`)

Chronological list of `dailyLog.entries` for the active date. Each row:
item name, `pct%`, computed amount via `personalizedDb`, time. Animations:
`flip` on the list, `fly` for row enter/exit. **Edit-in-place is not
supported in v1**; delete + re-add is the workflow.

**Delete affordance is responsive**:

- **Mobile (`<md`, touch):** swipe-left reveals a delete button; pointer
  events + `Spring` for the slide; no library.
- **Desktop (`md+`, mouse):** a small Lucide trash icon appears on row hover
  (also focusable via Tab for keyboard users). Click → confirm in-row
  ("Видалити?" inline) → `dailyLog.remove(ts)`.

Both paths call the same `remove(ts)` action.

### 8.8 Stats (`routes/Stats.svelte`)

- **Heatmap (last 90 days)** via `svelte-frappe-charts`. For each day:
  green = all categories ≤100%, red = any over 100%, gray = no data. Built
  by enumerating `storage.keys()`, parsing dates, computing per-day verdicts.
- **Bar chart (week)** via `svelte-frappe-charts`. Tabs above the chart pick a
  category (А–Ж). X = last 7 days, Y = % consumed (0..N). Tab switch updates
  the existing chart instance — don't re-mount.

**Layout is responsive**: charts stack vertically on mobile and place side by
side at `lg+` (`grid-cols-1 lg:grid-cols-2 gap-6`). Frappe charts auto-resize
to their container, so each chart picks up the extra width on desktop without
custom logic.

### 8.9 DateStrip (`components/DateStrip.svelte`)

Horizontal 7-day strip centered on today. Tap a day → sets `activeDate`. Today
is highlighted; days with entries get a small dot. Swipe left/right to load
adjacent weeks.

### 8.10 Onboarding (`routes/Onboarding.svelte`)

3-step wizard, full-screen, no nav:

1. **Welcome** — short intro + "Почати" button.
2. **Measurements** — height (cm), weight (kg), gender (segmented), age,
   activity (4 choices: sedentary 1.2 / light 1.375 / moderate 1.55 / active 1.725).
3. **Confirm** — reveals computed `k_factor` and a sample scaled value
   ("Картопля: 100% = 299 г") with a `Tween` animation. "Готово" →
   `profile.save(...)` → tabs visible.

Step transitions: `fly` (left/right). A post-onboarding profile-edit screen is
**not** in v1 (see §11); users re-onboard by clearing storage if they need to
change profile values.

## 9. Animations

- **Built-ins** for routine work: `svelte/transition` (`fade`/`fly`/`scale`),
  `svelte/animate` (`flip` for list reorder), `svelte/motion` (`Spring`/`Tween`
  classes for live numbers).
- **One added library** — `motion` (Motion One, ~5KB gzipped) — wrapped in
  `lib/anim.ts` with three named helpers:
  - `pulseSuccess(el)` — fires when an entry is added.
  - `pulseWarning(el)` — fires when a category crosses 100%.
  - `celebrate(el)` — fires when viewing a clean past day; subtle scale + ring
    fade, no confetti dependency.

All "important moment" animations route through these three helpers — keeps
the visual vocabulary consistent and the dependency surface tiny.

## 10. PWA & deploy

### 10.1 `vite.config.ts`

```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Calorie',
        short_name: 'Calorie',
        lang: 'uk',
        theme_color: '#4CAF50',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'] },
    }),
  ],
});
```

### 10.2 Telegram init (`main.ts`)

```ts
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  // Wire Telegram theme params into CSS custom properties consumed by Tailwind.
}

mount(App, { target: document.getElementById('app')! });
```

`index.html` includes `<script src="https://telegram.org/js/telegram-web-app.js"></script>`.
Outside Telegram, `window.Telegram` is `undefined`, the storage driver falls
through to `LocalforageDriver`, and theme vars use Tailwind defaults.

### 10.3 GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint              # parity with pre-commit; fail loud if hooks were skipped
      - run: pnpm format:check
      - run: pnpm check
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 10.4 `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  }
}
```

`prepare` runs automatically after `pnpm install`, so cloning the repo + one
install bootstraps the husky hooks. No separate setup step.

### 10.5 Telegram bot

Out of scope for v1 build steps. After GitHub Pages deploy is live, the user
will create a bot via @BotFather and run `/newapp` pointing at the deploy URL.
No code changes needed — the Telegram script tag and storage driver are
already wired.

## 11. Out of scope for v1

- Data export (no trainer per HLD).
- Backups beyond Telegram CloudStorage / localforage.
- Multi-user / accounts / auth / telemetry.
- Item search/filter in the bottom sheet (8 categories × ≤10 items is small).
- Edit-in-place for journal entries (delete + re-add).
- Profile-edit screen post-onboarding (re-onboard by clearing storage in v1).
- Automated tests (TS + svelte-check + visual verification only).
- i18n (Ukrainian only).

## 12. Resolved ambiguities

| Question                           | Decision                                                                                                                                                                                 | Why                                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Over-100% behavior                 | Soft cap: allow logging, show red, never block                                                                                                                                           | User wants to see reality, not be prevented from logging it.                                                                             |
| Eggs / non-gram items              | Generic `unit?: string` field on items, defaults to "г"                                                                                                                                  | Lets the input form switch labels and step size; future-proof.                                                                           |
| Pieces scaling under k-factor      | Pieces don't scale                                                                                                                                                                       | Eggs are eggs regardless of body size.                                                                                                   |
| Journal entry edit                 | Delete + re-add only                                                                                                                                                                     | Simpler; v1 doesn't need it.                                                                                                             |
| State management                   | Runes-only `.svelte.ts` modules                                                                                                                                                          | Modern Svelte 5 idiom, better TS inference.                                                                                              |
| K-factor extreme inputs            | Clamp to [0.6, 1.6]                                                                                                                                                                      | Typo protection.                                                                                                                         |
| Tab swap mechanism                 | `display:none` toggle, not mount/unmount                                                                                                                                                 | Preserves chart state + scroll position.                                                                                                 |
| Animation library                  | Svelte built-ins + `motion` (Motion One, ~5KB)                                                                                                                                           | Tiny footprint, covers all "important moment" cases.                                                                                     |
| Mobile vs desktop                  | Mobile-first; desktop adapts at Tailwind `md` (768px) and `lg` (1024px) — sidebar nav, 4-column dashboard grid, side-by-side charts, hover-delete in journal, centered-modal entry sheet | One DOM tree, just Tailwind responsive classes; no separate desktop codepath.                                                            |
| Lint / format / type check tooling | ESLint v9 flat + `typescript-eslint` + `eslint-plugin-svelte` + Prettier (with svelte + tailwindcss plugins) + `svelte-check`                                                            | Modern Svelte/TS canonical stack; ESLint flat config is the v9 default; Prettier owns formatting so ESLint stays focused on correctness. |
| Pre-commit hook runner             | husky v9 + lint-staged v15                                                                                                                                                               | De-facto standard, auto-bootstrapped via `prepare` script; no extra setup for new clones.                                                |
| Pre-commit scope                   | `lint-staged` (eslint+prettier on staged files) → `pnpm check` (full project)                                                                                                            | Per-file lint/format keeps hooks fast; full-project type check catches cross-file errors that staged-only would miss.                    |
| Strict TS settings                 | `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`                                                                                                     | Catches the bugs you'd otherwise hit at runtime in a data-shape-heavy app.                                                               |

## 13. Code quality (lint, format, type check, hooks)

The pipeline:

```
git commit ─┐
            ▼
        .husky/pre-commit
            ▼
        lint-staged ──► eslint --fix  ──► prettier --write   (only staged files)
            ▼
        pnpm check  (svelte-check over the whole project)
            ▼
        commit succeeds (or aborts on any non-zero exit)
```

CI (`.github/workflows/deploy.yml`) re-runs `pnpm lint`, `pnpm format:check`,
and `pnpm check` on the full project before `pnpm build`, as a safety net in
case hooks were skipped locally (e.g. `--no-verify`).

### 13.1 TypeScript config (`tsconfig.json`)

```jsonc
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "types": ["svelte", "vite/client", "vite-plugin-pwa/client"],
    "paths": {
      "$lib/*": ["./src/lib/*"],
      "$state/*": ["./src/state/*"],
      "$types/*": ["./src/types/*"],
    },
    "baseUrl": ".",
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "src/**/*.svelte.ts"],
}
```

Why these specific flags:

- `noUncheckedIndexedAccess` — catches `entries[0]` returning `T | undefined`
  rather than `T`. Important because `dailyLog.entries` is read by index in
  the journal/heatmap.
- `exactOptionalPropertyTypes` — `unit?: string` truly means "may be absent",
  not "may be `undefined`". Avoids subtle drift on the food DB.
- `verbatimModuleSyntax` — forces `import type` for type-only imports; helps
  the bundler dead-code-eliminate.

### 13.2 ESLint config (`eslint.config.js`)

Flat config (ESLint v9 default). Shape:

```js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';

export default [
  { ignores: ['dist', 'dev-dist', 'node_modules', '.svelte-kit', 'pnpm-lock.yaml'] },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        project: './tsconfig.json',
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: ts.parser },
    },
  },
  // Project-specific tweaks
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'svelte/no-at-html-tags': 'error',
      'svelte/valid-compile': 'error',
    },
  },
  prettier, // must come last — disables stylistic rules that fight Prettier
];
```

Notes:

- `recommendedTypeChecked` (rather than plain `recommended`) enables
  type-aware lint rules; needs the `project` parserOption.
- `flat/recommended` from `eslint-plugin-svelte` understands runes (`$state`,
  `$derived`, etc.) and `.svelte.ts` modules.
- `eslint-config-prettier` is **last** so it can disable the stylistic rules
  Prettier owns.

### 13.3 Prettier config (`.prettierrc`)

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

`prettier-plugin-tailwindcss` must be **last** in the `plugins` array so it
runs after `prettier-plugin-svelte`'s parser hand-off — otherwise class lists
inside `.svelte` files don't get sorted.

`.prettierignore`:

```
dist
dev-dist
node_modules
pnpm-lock.yaml
public/icons
```

### 13.4 Husky + lint-staged

`.husky/pre-commit`:

```sh
pnpm lint-staged
pnpm check
```

`lint-staged` config in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,svelte,svelte.ts}": ["eslint --fix", "prettier --write"],
    "*.{js,cjs,mjs,json,jsonc,css,md,yml,yaml,html}": ["prettier --write"]
  }
}
```

Order matters within the array: ESLint runs first (may rewrite imports, fix
violations), Prettier runs after (final formatting pass). Both are run only
against staged files — fast even on large projects.

`pnpm check` runs `svelte-check` over the entire project after lint-staged
finishes; it's not file-scoped because TS errors can cross files (a wrong
import in one file surfaces as an error in its dependents).

### 13.5 Editor consistency (`.editorconfig`)

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

Keeps editors aligned with Prettier so file diffs aren't churn.

### 13.6 Bypass policy

Pre-commit hooks should not be bypassed. If a real reason to skip them comes
up (rare), use `git commit --no-verify` and fix the issue immediately after —
CI re-runs all three checks (`pnpm lint`, `pnpm format:check`, `pnpm check`)
on every push, so anything skipped locally fails the deploy job.

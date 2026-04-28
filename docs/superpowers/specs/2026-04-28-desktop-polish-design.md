# Desktop Polish — Design

Date: 2026-04-28
Status: Approved (auto-mode execution)
Scope: Telegram mini app + PWA, `md:` breakpoint and up. Mobile is unchanged.

## Goals

1. Replace the wasted-space single-column desktop look with a proper two-pane layout.
2. Move the date strip into a contextual header row with a page title — the full-bleed date band looks wrong at desktop widths.
3. Make per-route layouts use multiple columns where it helps (Activity, Profile, Dashboard) instead of long narrow strips.
4. Cap content width so the app doesn't stretch absurdly on 1920+ monitors. Center beyond 1440.

## Non-goals

- Mobile changes (the mobile view is good; touch nothing below `md:`).
- New features (no new pages, no new actions, no new data).
- Three-pane / master-detail / top-bar nav patterns. Two-pane was chosen for parity with the mobile BottomNav tab metaphor.
- Automated tests (existing gates: `pnpm run check`, `lint`, `build`, manual viewport pass).

## Approach

Two-pane shell: SideNav (256px) on the left, main column on the right. The main column gains a desktop header row at `md:` and up containing the current page title (left) and a compact DateStrip (right). The full-bleed mobile DateStrip and BottomNav stay untouched below `md:`. Per-route layouts switch from single-column strips to multi-column grids at `md:`. Content max-width caps at `max-w-6xl` (1152px); beyond ~1440 viewports the content stops scaling and centers with empty gutters.

## Architecture

### Root layout (`src/App.svelte`)

```
┌──────────┬─────────────────────────────────────────┐
│          │  Раціон             ‹ Mon Tue Wed ... › │  ← DesktopHeader (md+)
│ SideNav  ├─────────────────────────────────────────┤
│ (256px)  │                                         │
│          │  <main> max-w-6xl mx-auto px-6 py-6     │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
```

Mobile (`< md`) layout is unchanged: full-bleed DateStrip on top, scroll region in middle, BottomNav at bottom. The SideNav already has `md:flex hidden`; the BottomNav has `md:hidden`. We add a similar split for DateStrip vs DesktopHeader.

### New component: `src/components/DesktopHeader.svelte`

A thin top bar visible only at `md:` and up. Composes the page title and a compact DateStrip.

```svelte
<script lang="ts">
  import { NAV_ITEMS } from '$lib/nav';
  import { activeRoute } from '$state/route.svelte';
  import DateStrip from './DateStrip.svelte';

  let title = $derived(NAV_ITEMS.find((i) => i.key === activeRoute.value)?.label ?? '');
</script>

<header class="border-border hidden items-center justify-between gap-4 border-b px-6 py-3 md:flex">
  <h2 class="text-fg text-xl font-semibold">{title}</h2>
  <DateStrip compact />
</header>
```

### `src/components/DateStrip.svelte` — `compact` prop

Add `compact?: boolean` to `Props`. When true:

- Outer wrapper switches from `flex items-center gap-1 ... w-full` to `inline-flex items-center gap-1` so the strip takes its natural width.
- No top safe-area padding (header row owns spacing).
- No bottom border (the header has its own).
- Day cells: `min-w-9 px-1 py-1` with `text-[11px]` weekday + `text-base` day-number (down from `text-xs` / `text-lg`).
- Prev/next buttons: `min-h-9 px-2 py-1` (smaller).

The non-compact (mobile) variant is unchanged.

### `src/App.svelte` — render the right header at the right breakpoint

Replace the single `<DateStrip />` line with two — one mobile, one desktop:

```svelte
<div class="md:hidden"><DateStrip /></div>
<DesktopHeader />
```

`<main>` max-width: `max-w-5xl` → `max-w-6xl`. Padding: `px-2 md:px-6` → `px-2 md:px-6 md:py-6`.

### `src/components/SideNav.svelte` — wider, with section heading

- Width `w-56` → `w-64`.
- Add a small uppercased section label above the nav-item list (`Сьогодні`).
- Logo row stays as-is.

```svelte
<nav class="border-border bg-bg hidden h-full w-64 shrink-0 flex-col gap-1 border-r p-4 md:flex">
  <div class="mb-4 flex items-center gap-2 px-2">…logo…</div>
  <h2 class="text-muted mt-2 mb-1 px-3 text-[11px] font-semibold tracking-wider uppercase">
    Сьогодні
  </h2>
  {#each NAV_ITEMS as item (item.key)}…{/each}
</nav>
```

### Per-route desktop layouts

| Route     | Mobile                              | Desktop (md+)                                                                                                                           |
| --------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard | 1-col → sm 2-col → lg 4-col         | md 4-col → lg 4-col (unchanged at lg, bumped at md)                                                                                     |
| Journal   | full-bleed list                     | `mx-auto max-w-2xl` centered list                                                                                                       |
| Activity  | `max-w-md` strip                    | 2-col grid (`md:grid md:grid-cols-2 md:gap-4`); steps card left, strength right                                                         |
| Stats     | DailyTotals full-width + 1-col grid | DailyTotals full-width + lg 2-col (Heatmap + BarChart) — unchanged                                                                      |
| Profile   | `max-w-md` strip                    | 2-col (`md:grid md:grid-cols-2 md:gap-6`); left rail (TG header + targets card) `md:sticky md:top-4 md:self-start`, right column = form |

Specifics:

**Dashboard** — change grid classes from `grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4` to `grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4`.

**Journal** — outer `<section class="p-2 md:p-4">` becomes `<section class="mx-auto max-w-2xl p-2 md:p-4">`.

**Activity** — outer `<section>` changes from `mx-auto flex max-w-md flex-col gap-4 p-3 md:p-6` to `mx-auto flex max-w-md flex-col gap-4 p-3 md:max-w-none md:grid md:grid-cols-2 md:gap-4 md:p-6`. The two cards (Steps + Strength) become grid items. Their internal markup is unchanged.

**Profile** — outer `<section class="mx-auto max-w-md p-3 md:p-6">` becomes `<section class="mx-auto max-w-md p-3 md:grid md:max-w-5xl md:grid-cols-2 md:gap-6 md:p-6">`. Two children:

- **Left rail** wraps `<TelegramUserHeader />` + the heading row + the targets grid + the descriptive `<p>` text. Class: `md:sticky md:top-4 md:self-start`.
- **Right column** wraps the `<ProfileForm>` and the toast `<p>`.

Mobile preserves the original linear order: header → heading → targets → description → form → toast (the children render top-to-bottom in mobile because `md:grid` only kicks in at md+).

## Files touched

| File                                  | Action                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| `src/components/DesktopHeader.svelte` | create                                                                |
| `src/App.svelte`                      | modify (split DateStrip/DesktopHeader, bump main max-width + padding) |
| `src/components/DateStrip.svelte`     | extend (`compact` prop + conditional classes)                         |
| `src/components/SideNav.svelte`       | modify (`w-56` → `w-64`; add section heading)                         |
| `src/routes/Dashboard.svelte`         | modify (grid bumps to md 4-col)                                       |
| `src/routes/Journal.svelte`           | modify (`max-w-2xl` centering)                                        |
| `src/routes/Activity.svelte`          | modify (2-col grid at md+)                                            |
| `src/routes/Profile.svelte`           | modify (2-col grid at md+ with sticky left rail)                      |
| `src/routes/Stats.svelte`             | unchanged                                                             |

No state stores, no lib utilities, no data layer changes. No new dependencies.

## Verification

Manual viewport pass via `pnpm run dev` at:

- 1024×640 (md kicks in)
- 1280×800 (typical laptop)
- 1440×900 (generous)
- 1920×1080 (over-cap)

Confirm at each:

1. SideNav 256px wide; logo + "Сьогодні" heading + 5 nav items + active row highlight (left-border + accent text + bg-surface-2).
2. Desktop header shows page title (left) and compact 7-day strip (right). Title updates when switching tabs.
3. Mobile full-bleed DateStrip is hidden at md+; desktop compact strip is hidden below md.
4. Dashboard 4-col at 1024px+, no card overflow.
5. Journal narrows to `max-w-2xl` and centers on desktop.
6. Activity 2-col at md+: steps left, strength right.
7. Profile 2-col at md+: TG header + targets sticky left; form right. Edit form → Save enables → Save → targets card pulse visible without scrolling.
8. Stats: DailyTotals full-width, Heatmap + BarChart 2-col at lg+.
9. EntrySheet on desktop renders centered modal (not bottom sheet) — current `md:top-1/2 md:bottom-auto md:left-1/2 ...` already handles this; verify still good.
10. At 1920+, content caps at 1152px and centers; gutters grow but no horizontal scrollbar.
11. Theme switch (light/dark) still clean at all desktop widths.
12. Tab-switch via SideNav resets `<main>` scroll to top.

No automated tests. Gates: `pnpm run check && pnpm run lint && pnpm run build`.

## Risks

- **DesktopHeader + DateStrip stacking confusion** — must hide mobile DateStrip at md+ AND show DesktopHeader at md+ (mutually exclusive). A small CSS bug could double-render. Verify visually at 768px and 1024px.
- **DateStrip compact variant overflow** — at md+ the header row is wide; compact strip should fit comfortably even at the smallest md viewport (768px wide minus 256px sidebar minus padding = ~480px). 7 cells at min-w-9 = 252px + paddings ~80px = ~332px. Comfortable.
- **Profile sticky rail height** — if the form on the right gets very long, the sticky left rail stays in place. Need `md:self-start` so the rail doesn't stretch to match the form's height. Spec includes this.
- **Onboarding** — runs in its own route outside the App-shell `{:else}` branch. Not affected by these changes; remains as today.
- **Telegram Desktop sizing** — Telegram's mini-app desktop window sizes vary (some users open it small, like 400×600). At those sizes we're below `md:` and use mobile layout. That's fine.

## Open follow-ups (not in scope)

- A search input in the SideNav (food lookup across categories).
- Keyboard shortcuts at md+ (`g d` → Dashboard, `g j` → Journal, etc.).
- Settings/preferences link in the SideNav (theme override toggle, etc.).

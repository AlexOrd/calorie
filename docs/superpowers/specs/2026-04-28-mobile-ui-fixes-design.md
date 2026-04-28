# Mobile UI Fixes — Design

Date: 2026-04-28
Status: Approved (pending spec review)
Scope: Telegram mini app, mobile-first (iPhone 14 Pro Max, Galaxy S25)

## Goals

1. Eliminate stray vertical/horizontal scrollbars on mobile.
2. Make the date strip ("header") and bottom nav ("footer") sticky.
3. Tapping a date anywhere switches to the Dashboard (Раціон) screen with that date active.
4. Profile form: disable Save when unchanged; show a clear "saved + recalculated" signal; recalculated daily targets propagate to Dashboard/Stats automatically.
5. Show Telegram user identity on the Profile page; placeholder when running outside Telegram.
6. Reset scroll to top on every route change.
7. Apply mobile-first best practices for tap targets, safe areas, viewport, inputs, and Telegram WebApp behavior.

## Non-goals

- Desktop redesign (SideNav layout stays; only the mobile shell changes structurally).
- Editing Telegram identity (TG is the source of truth; we display only).
- Persisting per-route scroll positions.
- New automated tests beyond what already exists.

## Approach

App-shell layout: a fixed-viewport flex column with three slots — top chrome, scroll region, bottom chrome. Only the middle scrolls. This is the standard Telegram mini-app / native-feel pattern; it answers the scrollbar question structurally rather than patching symptoms, and it makes "sticky" free.

## Architecture

### Root layout (`src/App.svelte`)

```
html, body         height: 100dvh
                   overflow: hidden
                   overscroll-behavior: none
                   touch-action: pan-y

.app-shell         h-[100dvh] flex flex-col
                   pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]

  <DateStrip />        shrink-0
                       pt-[max(8px, env(safe-area-inset-top))]
                       border-b (subtle)

  <main bind:this={mainEl}>
                       flex-1 min-h-0
                       overflow-y-auto overflow-x-clip
                       overscroll-contain
                       scrollbar hidden (see below)
                       scroll-padding-bottom: 16rem
    {current route}
  </main>

  <BottomNav />        shrink-0
                       pb-[env(safe-area-inset-bottom)]
                       border-t (subtle)
                       hidden on md+ (SideNav takes over)
```

Notes:

- `100dvh`, not `100vh` — handles iOS dynamic toolbar.
- BottomNav stops being `fixed`; the existing `pb-16` content offset is removed.
- Desktop (`md+`) keeps current SideNav layout; the shell pattern is mobile-only. SideNav becomes a flex sibling of `<main>` on desktop.
- DateStrip + BottomNav are flex siblings of the scroll region — visible at all times without `position: sticky`. Avoids known iOS sticky-during-body-scroll bugs.

### Route store

New file `src/state/route.svelte.ts`, following the project's existing runes-based store convention (see `src/state/activeDate.svelte.ts`):

```ts
import type { TabKey } from '$lib/nav';

let _route = $state<TabKey>('dashboard');

export const activeRoute = {
  get value(): TabKey {
    return _route;
  },
  set(this: void, route: TabKey): void {
    _route = route;
  },
};
```

`App.svelte` reads `activeRoute.value` to render the current route. `BottomNav`, `SideNav`, and `DateStrip` call `activeRoute.set(...)`. Replaces today's `bind:current` prop on the navs.

## Behavior

### Scroll & overflow

- **No visible scrollbars.** `<main>` uses `scrollbar-width: none` plus `&::-webkit-scrollbar { display: none }`. (Telegram desktop/browser previously showed them; phone never did.)
- **Horizontal containment.** `<main>` uses `overflow-x: clip` (cuts visually, doesn't create a scroll context).
- **DateStrip overflow audit.** On 393px-wide Galaxy S25: 7 cells + 2 nav buttons + paddings can exceed viewport. Fix at implementation: `min-w-0` on flex children, `flex: 1 1 0` on cells, ensure no `min-w-*` on the row. If a horizontally scrollable date row is intentional, give it `touch-action: pan-x` and hidden scrollbars.
- **No body bounce.** `overscroll-behavior: none` on html/body; `overscroll-behavior: contain` on `<main>`. Prevents iOS rubber-band leaking to Telegram's webview.
- **EntrySheet.** `max-h-[85vh]` → `max-h-[85dvh]`; add `overscroll-contain` so swipes inside don't scroll the page beneath.

### Sticky chrome

Falls out of the shell architecture. No `position: sticky` needed. Add a thin border/shadow on DateStrip's bottom and BottomNav's top so the boundary reads against scrolling content.

### Date tap → Dashboard

`DateStrip`'s click handler does both:

```ts
activeDate.set(key);
activeRoute.set('dashboard');
```

Tapping the currently active date while already on Dashboard is a no-op (no flicker).

### Active-item highlight (BottomNav, SideNav)

Today both navs already use color (`text-accent` / `text-fg bg-white/5`) — strengthen so the active state is unambiguous on mobile:

- **BottomNav (mobile):**
  - Inactive: `text-muted`, stroke icon
  - Active: `text-accent`, **filled icon** (use Lucide filled variant or `fill-current` on the stroked icon), small accent pill behind the icon (`rounded-full bg-accent/15 px-3 py-1`)
  - Tap: 0.95→1.0 scale (existing anim helper)
- **SideNav (desktop):**
  - Inactive: `text-muted`
  - Active: `text-accent bg-white/5 border-l-2 border-accent`
- `aria-current="page"` stays on active item.
- Class binding switches from prop comparison to `activeRoute.value === item.key`.

### Profile form: dirty state + recalc feedback

`src/components/ProfileForm.svelte`:

- On mount, snapshot loaded values into `initialValues` (object of the editable fields).
- `isDirty` derives from `JSON.stringify(currentValues) !== JSON.stringify(initialValues)`.
- After successful save, set `initialValues = { ...currentValues }` so the form returns to clean.
- Edit-then-revert returns the form to clean (no save fires).

Save button states:

| Condition           | Disabled | Label                | Visual |
| ------------------- | -------- | -------------------- | ------ |
| `!valid`            | yes      | "Зберегти"           | muted  |
| `valid && !isDirty` | yes      | "Зберегти"           | muted  |
| `valid && isDirty`  | no       | **"Зберегти зміни"** | accent |
| saving              | yes      | spinner              | accent |

`src/routes/Profile.svelte`:

- After successful save, briefly pulse the targets card: 200ms scale 1→1.02→1, single cycle, plus a 600ms accent-tinted halo. Reuse `src/lib/anim.ts`.
- Replace today's "Збережено" toast (on Profile only) with: **"Цілі оновлено за новим профілем"**, bottom of `<main>`, auto-dismiss 2.5s. Other contexts can keep their existing toast text.

Targets recalc itself requires no new wiring: `dailyTargets` is derived from the profile store, so Dashboard rings, Stats charts, and the Profile targets card all update automatically when the profile is saved.

### Telegram user header (Profile)

New compact card at the top of `src/routes/Profile.svelte`, above the form:

```
[avatar 48px]  {first_name} {last_name}
               @{username}                ★ (if is_premium)
```

Source: `window.Telegram.WebApp.initDataUnsafe.user`.

Fallbacks:

- **No TG context (web dev mode / guest):** name = **"Одрі"**, avatar = `/logo.png` rendered in a 48px `rounded-full` mask, no username line, no premium star
- **No `photo_url` (TG user with no avatar):** first-letter circle, accent-colored, using `first_name[0]`
- **No `is_premium`:** omit the star

Wiring: small util `src/lib/telegram.ts` exporting `getTelegramUser()` that reads `window.Telegram?.WebApp?.initDataUnsafe?.user ?? null`. Profile reads once at mount; not reactive (TG user doesn't change mid-session).

This is read-only display. The form below remains the editable _nutrition_ profile.

### Scroll-to-top on route change

In `App.svelte`:

```ts
$effect(() => {
  activeRoute.value; // track
  mainEl?.scrollTo({ top: 0, behavior: 'instant' });
});
```

`instant`, not smooth — native-feel for tab switching. Applies on every route change, including the date-tap → Dashboard path. No per-route scroll memory.

## Mobile-first details

### Tap targets

Audit and bump every interactive element to ≥ 44×44pt (`min-h-11 min-w-11`):

- DateStrip cells (extra hit-area via padding; visual cell can stay smaller)
- BottomNav icon buttons (likely already pass)
- ProfileForm steppers / chips
- Journal entry rows + delete buttons
- Apply a base utility class to all `<button>` (e.g., `min-h-11`) where it doesn't break visuals.

### Safe areas

- Top: DateStrip `pt-[max(8px, env(safe-area-inset-top))]` (already present — keep)
- Bottom: BottomNav `pb-[env(safe-area-inset-bottom)]` (already present — keep)
- Left/right: shell `pl/pr-[env(safe-area-inset-left/right)]` (new — landscape insurance)

### Telegram WebApp viewport

In `src/main.ts`, after `tg.expand()`:

```ts
tg.disableVerticalSwipes?.(); // TG 7.7+; safe-call
```

Stops swipe-down inside the app from triggering mini-app dismissal. `tg.ready()` order unchanged.

### Inputs

- Weight (kg): `type="number" inputmode="decimal" step="0.1" autocomplete="off" enterkeyhint="next"`
- Age (years): `type="number" inputmode="numeric" step="1" autocomplete="off"`
- Height (cm): `type="number" inputmode="numeric" step="1" autocomplete="off"`
- All numeric inputs: minimum `font-size: 16px` to prevent iOS zoom-on-focus; if design needs smaller, use a transform.
- No `autocorrect`, no `autocapitalize` on numeric.

### Keyboard handling

Body locked at `100dvh`, only `<main>` scrolls — focusing an input scrolls within `<main>` rather than reflowing the shell. DateStrip + BottomNav remain visible. `<main>` has `scroll-padding-bottom: 16rem` so a focused input near the bottom auto-scrolls clear of the on-screen keyboard.

### Body lock — `touch-action`

- html/body: `touch-action: pan-y` (allow vertical pan, disable pinch and double-tap zoom)
- DateStrip horizontal-scrollable row (if applicable): `touch-action: pan-x`

### No pull-to-refresh

`overscroll-behavior: none` on html/body covers it.

### Theming

Telegram theme integration in `src/main.ts` is unchanged.

## Files touched

| File                                    | Change                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/App.svelte`                        | New shell layout; bind `mainEl`; route-store reads; scroll-to-top effect                           |
| `src/index.css` (or app CSS)            | Body/html lock; scrollbar hide; safe-area utilities; touch-action                                  |
| `src/state/route.svelte.ts` (new)       | `activeRoute` runes store                                                                          |
| `src/components/DateStrip.svelte`       | Click handler also sets `activeRoute`; tap-target / touch-action audit                             |
| `src/components/BottomNav.svelte`       | Read `$activeRoute`; strengthen active state (filled icon + pill); remove `fixed` (now flex child) |
| `src/components/SideNav.svelte`         | Read `$activeRoute`; add accent left-border on active                                              |
| `src/components/EntrySheet.svelte`      | `85vh` → `85dvh`; `overscroll-contain`                                                             |
| `src/components/ProfileForm.svelte`     | `isDirty` tracking; new Save button states/labels                                                  |
| `src/routes/Profile.svelte`             | TG user header card; targets-card pulse + toast on save                                            |
| `src/lib/telegram.ts` (new or extended) | `getTelegramUser()`                                                                                |
| `src/main.ts`                           | `tg.disableVerticalSwipes?.()`                                                                     |
| `index.html`                            | Verify `<meta viewport>` has `viewport-fit=cover` (already present)                                |

No changes to `src/lib/macros.ts`, `src/state/personalizedDb.ts`, or any data layer.

## Verification

Manual viewport tests (Chrome devtools or Telegram desktop with device emulation):

- iPhone 14 Pro Max — 430×932, DPR 3
- Galaxy S25 — 393×852, DPR 3
- iPhone SE — 375×667 (sanity)

For each viewport, confirm:

1. No vertical scrollbar visible on body or `<main>`; `<main>` scrolls smoothly.
2. No horizontal scrollbar anywhere; nothing clipped that shouldn't be.
3. DateStrip stays pinned at top while scrolling Journal/Dashboard.
4. BottomNav stays pinned at bottom; safe-area inset present below it.
5. Tap any date on any tab → switches to Dashboard with that date active.
6. Active nav item has clear accent + filled icon + pill (BottomNav) / left-border (SideNav).
7. Profile load → Save disabled. Edit a field → Save enables, label "Зберегти зміни". Save → Save disables, targets card pulses, toast appears. Edit back to original → Save disables.
8. Open EntrySheet → swipe inside it doesn't scroll page beneath.
9. Focus any numeric input → no zoom, no layout reflow, input stays visible.
10. Switch tabs → `<main>` resets to top each time.
11. Profile in Telegram shows TG name/avatar; in `pnpm dev` browser shows "Одрі" + rounded `logo.png` avatar.

Telegram-specific (run on a phone if possible):

- App expands to full height; no white gap above DateStrip.
- Vertical swipe inside the app doesn't dismiss the mini app.
- Dark/light theme follows Telegram theme.

No new automated tests. Existing unit tests stay green.

## Risks

- **Removing `pb-16` while restructuring `App.svelte`** — must not regress content being hidden behind BottomNav. Verify on every route.
- **`overflow-x: clip` browser support** — Safari 16+ / Chrome 90+ both fine. Telegram WebView versions cover.
- **`100dvh` support** — Safari 15.4+ / Chrome 108+. Acceptable for Telegram mini app target audience.
- **Active-state filled icons** — Lucide icons are stroke-based; `fill-current` works on most but a few are line-only. If any look wrong, switch that icon to its filled twin or accept stroke + accent color + pill as sufficient.
- **`disableVerticalSwipes` availability** — guarded with optional chaining; degrades silently on older Telegram clients.

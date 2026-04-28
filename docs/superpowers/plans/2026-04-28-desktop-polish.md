# Desktop Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wasteful single-column desktop view with a proper two-pane layout: wider SideNav, a contextual page-title + compact DateStrip header, content capped at `max-w-6xl`, and per-route multi-column layouts. Mobile unchanged.

**Architecture:** App.svelte renders `<DateStrip />` (full-bleed) on mobile and a new `<DesktopHeader />` (page title + compact `<DateStrip compact />`) at `md:` and up. DateStrip gets a `compact` prop. SideNav widens 224→256px and gains a "Сьогодні" section label. Dashboard, Journal, Activity, Profile each pick up multi-column layouts at `md:`; Stats already does.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind v4. No new dependencies. No new tests. Verification: `command pnpm run check`, `command pnpm run lint`, `command pnpm run build`, plus manual viewport pass at 1024 / 1280 / 1440 / 1920 px.

**Spec:** `docs/superpowers/specs/2026-04-28-desktop-polish-design.md`

---

## File map

| File                                  | Action    | Responsibility                                                                                |
| ------------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `src/components/DesktopHeader.svelte` | create    | Page-title + compact DateStrip; visible at `md:` only                                         |
| `src/components/DateStrip.svelte`     | modify    | Add `compact?: boolean` prop with smaller cells / inline-flex / no top-pad / no bottom-border |
| `src/App.svelte`                      | modify    | Split mobile DateStrip vs DesktopHeader; bump `<main>` max-w + py                             |
| `src/components/SideNav.svelte`       | modify    | Width `w-56` → `w-64`; add "Сьогодні" section heading                                         |
| `src/routes/Dashboard.svelte`         | modify    | Grid bump to `md:grid-cols-4 md:gap-4`                                                        |
| `src/routes/Journal.svelte`           | modify    | Outer `<section>` adds `mx-auto max-w-2xl`                                                    |
| `src/routes/Activity.svelte`          | modify    | Outer `<section>` becomes 2-col grid at md+                                                   |
| `src/routes/Profile.svelte`           | modify    | Outer `<section>` becomes 2-col grid at md+; left rail sticky                                 |
| `src/routes/Stats.svelte`             | unchanged | (Already responsive)                                                                          |

No state stores, no lib code, no data, no deps.

---

## Conventions

- `command pnpm run check && command pnpm run lint` after each task. Both 0/0.
- Pre-commit hooks run prettier + svelte-check + eslint. If `git commit` fails on GPG signing, retry with `dangerouslyDisableSandbox: true`.
- Tailwind class strings post-prettier may be reordered alphabetically — that's fine as long as required tokens are present.
- One commit per task.

---

### Task 1: DateStrip — add `compact` prop

**File:** `src/components/DateStrip.svelte`

- [ ] **Step 1: Add the `compact` prop**

In the `<script>` block of `src/components/DateStrip.svelte`, after the existing imports, replace the script with:

```svelte
<script lang="ts">
  import { activeDate } from '$state/activeDate.svelte';
  import { addDays, dateFromKey, todayKey } from '$lib/date';
  import { activeRoute } from '$state/route.svelte';

  interface Props {
    compact?: boolean;
  }
  let { compact = false }: Props = $props();

  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

  let anchor = $state(activeDate.value);

  let days = $derived(Array.from({ length: 7 }, (_, i) => addDays(anchor, i - 3)));

  function shift(days: number): void {
    anchor = addDays(anchor, days);
  }

  function dayLabel(key: string): string {
    const d = dateFromKey(key);
    const dow = (d.getDay() + 6) % 7;
    return WEEKDAYS[dow] ?? '';
  }

  function dayNum(key: string): number {
    return dateFromKey(key).getDate();
  }

  const today = todayKey();
</script>
```

(The only addition vs the current file is the `Props` interface, the destructure, and `compact = false`.)

- [ ] **Step 2: Switch the outer wrapper between full-bleed and compact**

Replace the existing top-level `<div class="border-border flex items-center gap-1 ...">` block with:

```svelte
<div
  class={[
    'flex items-center gap-1',
    compact
      ? 'inline-flex'
      : 'border-border w-full border-b px-2 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:px-4',
  ]}
>
```

(Compact uses `inline-flex` so the strip takes its natural width inside the desktop header; non-compact keeps current full-width behavior.)

- [ ] **Step 3: Shrink prev/next buttons in compact mode**

Replace both prev and next button class strings. For the prev button (currently `class="text-muted hover:bg-surface-2 min-h-10 rounded px-3 py-2 text-base"`):

```svelte
<button
  type="button"
  class={[
    'text-muted hover:bg-surface-2 rounded',
    compact ? 'min-h-9 px-2 py-1 text-sm' : 'min-h-10 px-3 py-2 text-base',
  ]}
  onclick={() => shift(-7)}
  aria-label="Попередній тиждень"
>
  ‹
</button>
```

Apply the same pattern to the next button (replace `aria-label` with "Наступний тиждень" and `shift(-7)` with `shift(7)`).

- [ ] **Step 4: Shrink day cells in compact mode**

Replace the day-button class array (currently `'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-md px-1 py-1.5 text-xs'`):

```svelte
class={[
  'flex flex-col items-center justify-center rounded-md',
  compact ? 'min-h-9 min-w-9 px-1 py-1 text-[11px]' : 'min-h-12 min-w-0 flex-1 px-1 py-1.5 text-xs',
  activeDate.value === key
    ? 'bg-accent text-on-accent'
    : key === today
      ? 'text-fg font-bold'
      : 'text-muted',
]}
```

For the digit `<span class="text-lg font-semibold">`, swap it to a conditional size:

```svelte
<span class={['font-semibold', compact ? 'text-base' : 'text-lg']}>{dayNum(key)}</span>
```

Also wrap the inner `<div class="flex flex-1 justify-between gap-1">` so it doesn't try to fill width when compact:

```svelte
<div class={['flex gap-1', compact ? '' : 'flex-1 justify-between']}>
```

- [ ] **Step 5: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/DateStrip.svelte
git commit -m "feat(ui): DateStrip gains a compact variant for desktop header"
```

---

### Task 2: DesktopHeader component

**File:** Create `src/components/DesktopHeader.svelte`

- [ ] **Step 1: Create `src/components/DesktopHeader.svelte`**

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

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/DesktopHeader.svelte
git commit -m "feat(ui): add DesktopHeader (page title + compact date strip)"
```

(After this task the component exists but isn't rendered yet. Task 3 wires it in.)

---

### Task 3: App.svelte — wire DesktopHeader, hide mobile DateStrip at md+, bump main max-w + padding

**File:** `src/App.svelte`

- [ ] **Step 1: Add the import**

In the existing `<script>` block of `src/App.svelte`, add (with the other component imports):

```ts
import DesktopHeader from './components/DesktopHeader.svelte';
```

- [ ] **Step 2: Replace the `<DateStrip />` line and bump `<main>`**

In the markup, find:

```svelte
<DateStrip />
<main
  bind:this={mainEl}
  class="scroll-region mx-auto w-full max-w-5xl flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-2 md:px-6"
  style="scroll-padding-bottom: 16rem;"
>
```

Replace with:

```svelte
<div class="md:hidden"><DateStrip /></div>
<DesktopHeader />
<main
  bind:this={mainEl}
  class="scroll-region mx-auto w-full max-w-6xl flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-2 py-2 md:px-6 md:py-6"
  style="scroll-padding-bottom: 16rem;"
>
```

(Diff: full-bleed DateStrip wrapped in `md:hidden`; new DesktopHeader sibling; `max-w-5xl` → `max-w-6xl`; `px-2 md:px-6` → `px-2 py-2 md:px-6 md:py-6`.)

- [ ] **Step 3: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat(ui): app shell renders DesktopHeader at md+ with wider main"
```

---

### Task 4: SideNav widening + "Сьогодні" section heading

**File:** `src/components/SideNav.svelte`

- [ ] **Step 1: Widen and add the heading**

Replace the current `<nav>` block (lines 6–35 of the current file) with:

```svelte
<nav
  class="border-border bg-bg hidden h-full w-64 shrink-0 flex-col gap-1 border-r p-4 md:flex"
  aria-label="Головна навігація"
>
  <div class="mb-4 flex items-center gap-2 px-2">
    <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
      <img src="/logo.png" alt="" class="h-8 w-auto object-contain" />
    </div>
    <h1 class="text-accent text-lg font-semibold">Calorie</h1>
  </div>
  <h2 class="text-muted mt-2 mb-1 px-3 text-[11px] font-semibold tracking-wider uppercase">
    Сьогодні
  </h2>
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

(Diff vs current: `w-56` → `w-64`; new `<h2>` "Сьогодні" heading inserted between the logo row and the nav buttons; everything else unchanged. Also added `bg-bg` to make sure the sidebar bg doesn't show through to whatever is behind.)

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/SideNav.svelte
git commit -m "feat(ui): wider SideNav with section heading"
```

---

### Task 5: Dashboard — md 4-col grid

**File:** `src/routes/Dashboard.svelte`

- [ ] **Step 1: Update the section grid classes**

In the markup, find:

```svelte
<section class="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:p-4 lg:grid-cols-4">
```

Replace with:

```svelte
<section class="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:grid-cols-4 md:gap-4 md:p-4">
```

(Diff: `lg:grid-cols-4` → `md:grid-cols-4`, added `md:gap-4`.)

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Dashboard.svelte
git commit -m "feat(ui): Dashboard goes 4-col at md+ instead of lg+"
```

---

### Task 6: Journal — narrow centered list at md+

**File:** `src/routes/Journal.svelte`

- [ ] **Step 1: Update the section wrapper**

Find:

```svelte
<section class="p-2 md:p-4">
```

Replace with:

```svelte
<section class="mx-auto max-w-2xl p-2 md:p-4">
```

(Diff: added `mx-auto max-w-2xl`. Centered, narrower list at desktop widths.)

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Journal.svelte
git commit -m "feat(ui): Journal list centers and narrows at md+"
```

---

### Task 7: Activity — 2-col grid at md+

**File:** `src/routes/Activity.svelte`

- [ ] **Step 1: Update the outer section**

Find:

```svelte
<section class="mx-auto flex max-w-md flex-col gap-4 p-3 md:p-6">
```

Replace with:

```svelte
<section
  class="mx-auto flex max-w-md flex-col gap-4 p-3 md:grid md:max-w-none md:grid-cols-2 md:gap-4 md:p-6"
>
```

(Diff: at md+, switches from a single-column `flex flex-col` `max-w-md` to a 2-column grid filling the available width. Mobile keeps `flex flex-col max-w-md`.)

The two cards (Steps card and Strength toggle button) inside become grid items automatically — no inner changes.

The `<h2 class="text-xl font-semibold">Активність</h2>` heading also becomes a grid item, which is wrong (it would consume one of the two cells). Wrap it so it spans both columns:

Find:

```svelte
<h2 class="text-xl font-semibold">Активність</h2>
```

Replace with:

```svelte
<h2 class="text-xl font-semibold md:col-span-2">Активність</h2>
```

(Diff: `md:col-span-2` so the title sits across the top of both columns at md+.)

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Activity.svelte
git commit -m "feat(ui): Activity uses 2-col grid at md+"
```

---

### Task 8: Profile — 2-col grid with sticky left rail at md+

**File:** `src/routes/Profile.svelte`

The current markup is roughly:

```svelte
<section class="mx-auto max-w-md p-3 md:p-6">
  <TelegramUserHeader />

  <div class="mb-5 flex items-baseline justify-between">
    <h2 class="text-xl font-semibold">Профіль</h2>
    {#if profile.value}<span ...>k = ...</span>{/if}
  </div>

  {#if targets}
    <div bind:this={targetsEl} class="...targets grid...">…4 macro tiles…</div>
  {/if}

  <p class="text-muted mb-4 text-sm">…description…</p>

  <ProfileForm
    initial={profile.value}
    submitLabel="Зберегти"
    dirtyLabel="Зберегти зміни"
    onSubmit={save}
  />

  {#if savedRecently}
    <p class="text-ok mt-3 text-center text-sm">Цілі оновлено за новим профілем</p>
  {/if}
</section>
```

We'll wrap the current children into two grouping divs so they form left + right cells at md+, while the linear order is preserved on mobile.

- [ ] **Step 1: Restructure the section**

Replace the `<section>` and its children with:

```svelte
<section class="mx-auto max-w-md p-3 md:grid md:max-w-5xl md:grid-cols-2 md:gap-6 md:p-6">
  <div class="md:sticky md:top-4 md:flex md:flex-col md:gap-5 md:self-start">
    <TelegramUserHeader />

    <div class="mb-5 flex items-baseline justify-between md:mb-0">
      <h2 class="text-xl font-semibold">Профіль</h2>
      {#if profile.value}
        <span class="text-muted text-sm tabular-nums">k = {profile.value.k_factor.toFixed(2)}</span>
      {/if}
    </div>

    {#if targets}
      <div
        bind:this={targetsEl}
        class="border-border bg-surface mb-5 grid grid-cols-4 gap-2 rounded-lg border p-3 text-center md:mb-0"
      >
        <div>
          <div class="text-accent text-lg font-semibold tabular-nums">{targets.kcal}</div>
          <div class="text-muted text-[11px]">ккал</div>
        </div>
        <div>
          <div class="text-fg text-lg font-semibold tabular-nums">{targets.protein}</div>
          <div class="text-muted text-[11px]">білок, г</div>
        </div>
        <div>
          <div class="text-fg text-lg font-semibold tabular-nums">{targets.carbs}</div>
          <div class="text-muted text-[11px]">вугл., г</div>
        </div>
        <div>
          <div class="text-fg text-lg font-semibold tabular-nums">{targets.fat}</div>
          <div class="text-muted text-[11px]">жири, г</div>
        </div>
      </div>
    {/if}

    <p class="text-muted mb-4 text-sm md:mb-0">
      Зміна параметрів перерахує норми для всіх майбутніх днів. Існуючі записи журналу не
      змінюються.
    </p>
  </div>

  <div class="md:flex md:flex-col">
    <ProfileForm
      initial={profile.value}
      submitLabel="Зберегти"
      dirtyLabel="Зберегти зміни"
      onSubmit={save}
    />

    {#if savedRecently}
      <p class="text-ok mt-3 text-center text-sm">Цілі оновлено за новим профілем</p>
    {/if}
  </div>
</section>
```

(Notable changes vs current:

- Outer `<section>` is `mx-auto max-w-md p-3 md:grid md:max-w-5xl md:grid-cols-2 md:gap-6 md:p-6`.
- Two child `<div>`s: left rail (sticky at md+) and right column.
- `md:mb-0` on the heading row, targets card, and description paragraph — at md+ the parent's `gap-5` handles spacing; the mobile `mb-5` / `mb-4` is preserved below md.
- Targets card markup is identical to the current spec (4 tiles, kcal accent + others fg).
- All form-related markup stays in the right column.
- All existing bindings and animation refs (`targetsEl`) are preserved.)

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Profile.svelte
git commit -m "feat(ui): Profile two-column with sticky left rail at md+"
```

---

### Task 9: Manual verification

This task contains no code changes.

- [ ] **Step 1: Build for sanity**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

Expected: all clean.

- [ ] **Step 2: Dev server + viewport pass**

```bash
command pnpm run dev
```

Open the printed URL. In Chrome DevTools device toolbar add custom viewports:

- 1024 × 640
- 1280 × 800
- 1440 × 900
- 1920 × 1080

For each viewport, walk through the spec's verification checklist:

1. SideNav 256px wide; logo + "Сьогодні" heading + 5 nav items. Active row uses `border-l-2 border-accent text-accent bg-surface-2`.
2. Desktop header shows page title (left) + compact 7-day strip (right).
3. Mobile full-bleed DateStrip is hidden at md+.
4. Switching tabs updates the header title and resets `<main>` scroll to top.
5. Dashboard 4-col cards at 1024+; cards readable.
6. Journal narrows to `max-w-2xl` and centers.
7. Activity 2-col: Steps card left, Strength toggle right; "Активність" title spans both columns.
8. Profile 2-col: TG header + targets sticky left rail; ProfileForm right. Edit a field → Save enables → Save → targets card pulses without scrolling.
9. Stats: DailyTotals full-width, Heatmap + BarChart 2-col at lg+.
10. EntrySheet on desktop renders centered modal (existing `md:top-1/2 md:bottom-auto md:max-w-md ...`).
11. At 1920+, content stops at 1152px and centers; gutters grow.
12. No horizontal scrollbar at any width.

- [ ] **Step 3: If any check fails, fix and commit**

Stop the dev server. If fixes were applied:

```bash
git add -A
git commit -m "fix(ui): QA fixes from desktop verification pass"
```

---

## Self-review

**Spec coverage:**

| Spec section                    | Task   |
| ------------------------------- | ------ |
| DesktopHeader component         | Task 2 |
| DateStrip `compact` prop        | Task 1 |
| App.svelte split + max-w bump   | Task 3 |
| SideNav widen + section heading | Task 4 |
| Dashboard md 4-col              | Task 5 |
| Journal centered narrow         | Task 6 |
| Activity 2-col                  | Task 7 |
| Profile 2-col sticky left       | Task 8 |
| Stats unchanged                 | n/a    |
| Manual verification             | Task 9 |

All sections covered.

**Placeholder scan:** No "TBD" / "TODO" / "fill in details" markers. Every code step contains the actual changed code, including the surrounding context where helpful.

**Type consistency:**

- `compact?: boolean` prop on `DateStrip` is the only new type; consumed by `DesktopHeader` and the App.svelte mobile wrapper (which doesn't pass it, so it defaults to `false`).
- All other tasks operate on existing props / state / Tailwind classes.
- `NAV_ITEMS` typed as `readonly NavItem[]`; `activeRoute.value` is `TabKey`. The `find` lookup in DesktopHeader uses these existing types.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-04-28-desktop-polish.md`. Auto-mode active — proceeding to subagent-driven execution.

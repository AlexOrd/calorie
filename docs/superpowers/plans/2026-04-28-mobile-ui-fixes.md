# Mobile UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the calorie tracker into a true mobile-first Telegram mini app: app-shell layout, no stray scrollbars, sticky chrome, route-aware date strip, profile dirty-tracking with recalc feedback, Telegram user header, and scroll-to-top on route change.

**Architecture:** Restructure `App.svelte` into a fixed-viewport flex column (`100dvh`) with `DateStrip` on top, a single scrollable `<main>` in the middle, and `BottomNav` (mobile) / `SideNav` (desktop) on the chrome edges. A new runes-based `activeRoute` store replaces the `bind:current` prop wiring across navs and `DateStrip`, so any tap on a date forces the Dashboard tab. `<main>` is the only scrolling region; sticky becomes structural rather than CSS-positional.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind v4, Vite + PWA, Melt UI, Lucide icons, `motion` for animations. No test runner — verification is `pnpm run check` (svelte-check) + `pnpm run lint` + manual dev-server confirmation. **All commands use `command pnpm` to bypass the Aikido shell wrapper.**

**Spec:** `docs/superpowers/specs/2026-04-28-mobile-ui-fixes-design.md`

---

## File map

| File                                       | Action | Responsibility                                                                                                   |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/state/route.svelte.ts`                | create | `activeRoute` runes store (single source of truth for current tab)                                               |
| `src/lib/telegram.ts`                      | create | `getTelegramUser()` accessor reading `window.Telegram.WebApp.initDataUnsafe.user`                                |
| `src/components/TelegramUserHeader.svelte` | create | Avatar + name card; "Одрі" + `/logo.png` fallback for guest                                                      |
| `src/types/telegram.ts`                    | modify | Extend `TelegramWebApp` with `initDataUnsafe`, `disableVerticalSwipes`                                           |
| `src/App.svelte`                           | modify | App-shell layout, route store, scroll-to-top effect                                                              |
| `src/app.css`                              | modify | Body/html lock, `100dvh`, scrollbar-hide, `touch-action`, safe-area utilities                                    |
| `src/components/BottomNav.svelte`          | modify | Read `activeRoute`; remove `fixed`; strengthen active-state with pill                                            |
| `src/components/SideNav.svelte`            | modify | Read `activeRoute`; strengthen active-state with left-border                                                     |
| `src/components/DateStrip.svelte`          | modify | On tap also `activeRoute.set('dashboard')`; cells `flex-1 min-w-0` to fit 393px                                  |
| `src/components/EntrySheet.svelte`         | modify | `85vh → 85dvh`; `overscroll-contain`                                                                             |
| `src/components/ProfileForm.svelte`        | modify | `isDirty` tracking; new save-button states; `inputmode`/`enterkeyhint` on numeric inputs; await async `onSubmit` |
| `src/routes/Profile.svelte`                | modify | Mount `TelegramUserHeader`; new "targets" pulse card; recalc toast                                               |
| `src/main.ts`                              | modify | `tg.disableVerticalSwipes?.()`                                                                                   |

No changes to `src/lib/macros.ts`, `src/lib/scaling.ts`, `src/state/personalizedDb.ts`, `src/state/profile.svelte.ts`, or any data layer.

---

## Conventions used by every task

- **Verification gate before commit:** every task ends with `command pnpm run check && command pnpm run lint`. Both must exit 0.
- **Pre-commit hooks** run `prettier --write` + `svelte-check` automatically. If GPG signing fails (sandbox), retry with sandbox disabled.
- **Commit subject style:** lowercase scope; matches recent history (`feat:`, `fix:`, `refactor:`, `chore(ui):`).
- **No new tests are introduced.** Verification is type-check + lint + manual visual pass in Task 13.

---

### Task 1: Route store + swap navs/App from `bind:current` to store

**Files:**

- Create: `src/state/route.svelte.ts`
- Modify: `src/App.svelte`
- Modify: `src/components/BottomNav.svelte`
- Modify: `src/components/SideNav.svelte`

- [ ] **Step 1: Create `src/state/route.svelte.ts`**

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

- [ ] **Step 2: Replace `currentTab` in `src/App.svelte`**

In the `<script>` block, remove:

```ts
import type { TabKey } from '$lib/nav';
let currentTab = $state<TabKey>('dashboard');
```

Add at the top of the script (with other state imports):

```ts
import { activeRoute } from '$state/route.svelte';
```

In the markup, change `<SideNav bind:current={currentTab} />` to `<SideNav />` and `<BottomNav bind:current={currentTab} />` to `<BottomNav />`.

Replace the five `class:hidden` route conditions:

```svelte
<div class:hidden={activeRoute.value !== 'dashboard'}><Dashboard /></div>
<div class:hidden={activeRoute.value !== 'journal'}><Journal /></div>
<div class:hidden={activeRoute.value !== 'activity'}><Activity /></div>
<div class:hidden={activeRoute.value !== 'stats'}><Stats /></div>
<div class:hidden={activeRoute.value !== 'profile'}><Profile /></div>
```

- [ ] **Step 3: Replace `current` prop in `src/components/BottomNav.svelte`**

Replace the entire `<script>` block:

```svelte
<script lang="ts">
  import { NAV_ITEMS } from '$lib/nav';
  import { activeRoute } from '$state/route.svelte';
</script>
```

Update the button bindings (keeps existing classes/markup, just swaps `current` references):

```svelte
class={[
  'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px]',
  activeRoute.value === item.key ? 'text-accent' : 'text-muted',
]}
aria-current={activeRoute.value === item.key ? 'page' : undefined}
onclick={() => activeRoute.set(item.key)}
```

- [ ] **Step 4: Replace `current` prop in `src/components/SideNav.svelte`**

Replace the `<script>` block:

```svelte
<script lang="ts">
  import { NAV_ITEMS } from '$lib/nav';
  import { activeRoute } from '$state/route.svelte';
</script>
```

Update the button bindings:

```svelte
class={[
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
  activeRoute.value === item.key ? 'text-fg bg-white/5' : 'text-muted hover:bg-white/5',
]}
aria-current={activeRoute.value === item.key ? 'page' : undefined}
onclick={() => activeRoute.set(item.key)}
```

- [ ] **Step 5: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/state/route.svelte.ts src/App.svelte src/components/BottomNav.svelte src/components/SideNav.svelte
git commit -m "refactor(state): introduce activeRoute store; remove bind:current plumbing"
```

---

### Task 2: App-shell layout + body/html lock CSS

**Files:**

- Modify: `src/app.css`
- Modify: `src/App.svelte`
- Modify: `src/components/BottomNav.svelte`

- [ ] **Step 1: Update `src/app.css` body/html block**

Replace the existing `html, body` and `body` blocks (lines 17–31) with:

```css
html,
body {
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: pan-y;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    sans-serif;
}

/* Hide scrollbar chrome on the app's single scroll region. Phones never
   showed them; this stops desktop browsers / Telegram desktop from
   showing them either. */
.scroll-region {
  scrollbar-width: none;
}
.scroll-region::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Restructure `src/App.svelte` markup**

Replace the entire `{#if profile.loaded ... {/if}` block with:

```svelte
{#if !profile.loaded}
  <div class="text-muted flex h-dvh items-center justify-center">Завантаження…</div>
{:else if !profile.hasProfile}
  <Onboarding />
{:else}
  <div class="flex h-dvh">
    <SideNav />
    <div class="flex h-dvh flex-1 flex-col">
      <DateStrip />
      <main
        class="scroll-region mx-auto w-full max-w-5xl flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-2 md:px-6"
        style="scroll-padding-bottom: 16rem;"
      >
        <div class:hidden={activeRoute.value !== 'dashboard'}><Dashboard /></div>
        <div class:hidden={activeRoute.value !== 'journal'}><Journal /></div>
        <div class:hidden={activeRoute.value !== 'activity'}><Activity /></div>
        <div class:hidden={activeRoute.value !== 'stats'}><Stats /></div>
        <div class:hidden={activeRoute.value !== 'profile'}><Profile /></div>
      </main>
      <BottomNav />
    </div>
  </div>
{/if}
```

Note: `pb-16 md:pb-0` is removed (no longer needed — BottomNav is a flex sibling, not floating). `min-h-screen` becomes `h-dvh`.

- [ ] **Step 3: Remove `fixed` positioning from `src/components/BottomNav.svelte`**

Replace the `<nav>` opening tag:

```svelte
<nav
  class="bg-bg flex shrink-0 border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden"
  aria-label="Головна навігація"
>
```

(Removed: `fixed inset-x-0 bottom-0 z-30`. Kept: `bg-bg`, `border-t`, safe-area padding, `md:hidden`. Added: `flex shrink-0` so it sits as a flex child.)

- [ ] **Step 4: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/app.css src/App.svelte src/components/BottomNav.svelte
git commit -m "feat(ui): app-shell layout with locked viewport and single scroll region"
```

---

### Task 3: EntrySheet — `100dvh` + overscroll-contain

**Files:**

- Modify: `src/components/EntrySheet.svelte`

- [ ] **Step 1: Replace the sheet content classes**

In `src/components/EntrySheet.svelte` line 69, change:

```svelte
class="bg-bg fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-auto rounded-t-2xl border-t
border-white/10 p-4 md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-md md:-translate-x-1/2
md:-translate-y-1/2 md:rounded-2xl md:border"
```

to:

```svelte
class="bg-bg fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-auto overscroll-contain
rounded-t-2xl border-t border-white/10 p-4 md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-md
md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border"
```

Diff: `max-h-[85vh]` → `max-h-[85dvh]`; added `overscroll-contain` after `overflow-auto`.

- [ ] **Step 2: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/EntrySheet.svelte
git commit -m "fix(ui): EntrySheet uses dvh and contains overscroll"
```

---

### Task 4: DateStrip — tap-to-Dashboard + overflow fix

**Files:**

- Modify: `src/components/DateStrip.svelte`

- [ ] **Step 1: Add the route store import**

In the `<script>` block of `src/components/DateStrip.svelte`, add after the existing imports:

```ts
import { activeRoute } from '$state/route.svelte';
```

- [ ] **Step 2: Update the cell click handler**

Change the day-button `onclick` (around line 52) from:

```svelte
onclick={() => activeDate.set(key)}
```

to:

```svelte
onclick={() => {
  activeDate.set(key);
  activeRoute.set('dashboard');
}}
```

- [ ] **Step 3: Fix the cell width so 7 cells fit on a 393px viewport**

In the same button's `class` array (around line 45), change:

```svelte
'flex min-h-12 min-w-10 flex-col items-center justify-center rounded-md px-2 py-1.5 text-xs',
```

to:

```svelte
'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-md px-1 py-1.5 text-xs',
```

Diff: `min-w-10` → `min-w-0 flex-1` (cells share row width); `px-2` → `px-1` (was crowding the digit).

- [ ] **Step 4: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/DateStrip.svelte
git commit -m "feat(ui): tapping a date opens Dashboard; cells fit narrow viewports"
```

---

### Task 5: Strengthen active-item highlight (BottomNav, SideNav)

**Files:**

- Modify: `src/components/BottomNav.svelte`
- Modify: `src/components/SideNav.svelte`

- [ ] **Step 1: Wrap the icon with an accent pill in BottomNav**

In `src/components/BottomNav.svelte`, leave the button's class array as it is (Task 1 already set `activeRoute.value === item.key ? 'text-accent' : 'text-muted'`). The active-state strengthening happens by wrapping the icon in a pill `<span>`.

Replace the `<Icon size={24} />` line with:

```svelte
<span
  class={[
    'flex items-center justify-center rounded-full px-3 py-1 transition-colors',
    activeRoute.value === item.key && 'bg-accent/15',
  ]}
>
  <Icon size={22} class={activeRoute.value === item.key ? 'fill-current' : ''} />
</span>
```

(Pill backdrop only when active; icon stays stroked-only when inactive, gets `fill-current` when active for an extra signal. Lucide stroke icons with `fill-current` may look odd on a few — see Task 13 for visual QA; if any look wrong, drop the `fill-current` and rely on the pill + accent color.)

- [ ] **Step 2: Add left-border + accent to SideNav active state**

In `src/components/SideNav.svelte`, replace the button's class array:

```svelte
class={[
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
  activeRoute.value === item.key ? 'text-fg bg-white/5' : 'text-muted hover:bg-white/5',
]}
```

with:

```svelte
class={[
  'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
  activeRoute.value === item.key
    ? 'text-accent border-accent bg-white/5'
    : 'text-muted hover:bg-white/5 border-transparent',
]}
```

Diff: added `border-l-2`; active uses `text-accent border-accent bg-white/5`; inactive uses `border-transparent` to keep widths aligned.

- [ ] **Step 3: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.svelte src/components/SideNav.svelte
git commit -m "feat(ui): strengthen active nav-item indicator (pill on mobile, accent border on desktop)"
```

---

### Task 6: Scroll-to-top on route change

**Files:**

- Modify: `src/App.svelte`

- [ ] **Step 1: Bind `mainEl` and add the effect**

In the `<script>` block of `src/App.svelte`, add a state declaration after the imports:

```ts
let mainEl = $state<HTMLElement | undefined>(undefined);
```

Add a new `$effect` after the existing `$effect`:

```ts
$effect(() => {
  activeRoute.value;
  mainEl?.scrollTo({ top: 0, behavior: 'instant' });
});
```

- [ ] **Step 2: Bind the `<main>` element**

In the markup, change the `<main>` opening tag to bind:

```svelte
<main bind:this={mainEl} class="scroll-region mx-auto w-full max-w-5xl flex-1 overflow-y-auto overflow-x-clip overscroll-contain px-2 md:px-6" style="scroll-padding-bottom: 16rem;">
```

(Only addition: `bind:this={mainEl}`.)

- [ ] **Step 3: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat(ui): reset main scroll to top on every route change"
```

---

### Task 7: Telegram types extension + `getTelegramUser()` util

**Files:**

- Modify: `src/types/telegram.ts`
- Create: `src/lib/telegram.ts`

- [ ] **Step 1: Extend the `TelegramWebApp` type**

Replace the contents of `src/types/telegram.ts` with:

```ts
export interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (err: Error | null, ok: boolean) => void): void;
  getItem(key: string, callback: (err: Error | null, value: string | null) => void): void;
  removeItem(key: string, callback?: (err: Error | null, ok: boolean) => void): void;
  getKeys(callback: (err: Error | null, keys: string[]) => void): void;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitDataUnsafe {
  user?: TelegramWebAppUser;
  query_id?: string;
  auth_date?: number;
  hash?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  ready(): void;
  expand(): void;
  themeParams: TelegramThemeParams;
  CloudStorage: TelegramCloudStorage;
  disableVerticalSwipes?(): void;
}
```

- [ ] **Step 2: Create `src/lib/telegram.ts`**

```ts
import type { TelegramWebAppUser } from '$types/telegram';

export function getTelegramUser(): TelegramWebAppUser | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}
```

- [ ] **Step 3: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/types/telegram.ts src/lib/telegram.ts
git commit -m "feat(types): extend Telegram WebApp types with user + disableVerticalSwipes"
```

---

### Task 8: TelegramUserHeader component + Profile mount

**Files:**

- Create: `src/components/TelegramUserHeader.svelte`
- Modify: `src/routes/Profile.svelte`

- [ ] **Step 1: Create `src/components/TelegramUserHeader.svelte`**

```svelte
<script lang="ts">
  import { getTelegramUser } from '$lib/telegram';

  const user = getTelegramUser();
  const initial = user?.first_name?.[0] ?? '?';
  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Одрі';
</script>

<div class="mb-5 flex items-center gap-3">
  <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/5">
    {#if user?.photo_url}
      <img src={user.photo_url} alt="" class="h-12 w-12 object-cover" />
    {:else if user}
      <span class="text-accent text-xl font-semibold">{initial}</span>
    {:else}
      <img src="/logo.png" alt="" class="h-9 w-9 object-contain" />
    {/if}
  </div>
  <div class="flex min-w-0 flex-col">
    <div class="flex items-center gap-1.5">
      <span class="text-fg truncate text-base font-semibold">{fullName}</span>
      {#if user?.is_premium}
        <span class="text-warn text-sm" aria-label="Telegram Premium">★</span>
      {/if}
    </div>
    {#if user?.username}
      <span class="text-muted truncate text-sm">@{user.username}</span>
    {/if}
  </div>
</div>
```

- [ ] **Step 2: Mount the header in `src/routes/Profile.svelte`**

Add the import in the `<script>` block:

```ts
import TelegramUserHeader from '../components/TelegramUserHeader.svelte';
```

In the markup, insert the header as the first child of the `<section>`, above the existing heading row:

```svelte
<section class="mx-auto max-w-md p-3 md:p-6">
  <TelegramUserHeader />

  <div class="mb-5 flex items-baseline justify-between">
    ...
```

- [ ] **Step 3: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/TelegramUserHeader.svelte src/routes/Profile.svelte
git commit -m "feat(ui): show Telegram user header on Profile (logo + Одрі fallback for guest)"
```

---

### Task 9: ProfileForm — isDirty tracking + save button states + numeric input attrs

**Files:**

- Modify: `src/components/ProfileForm.svelte`

- [ ] **Step 1: Update the `Props` type to allow async `onSubmit`**

In `src/components/ProfileForm.svelte`, change:

```ts
interface Props {
  initial?: ProfileInput | null;
  submitLabel: string;
  onSubmit: (input: ProfileInput) => void;
}
```

to:

```ts
interface Props {
  initial?: ProfileInput | null;
  submitLabel: string;
  dirtyLabel?: string;
  onSubmit: (input: ProfileInput) => Promise<void> | void;
}
let { initial = null, submitLabel, dirtyLabel, onSubmit }: Props = $props();
```

(Remove the existing `let { initial = null, submitLabel, onSubmit }: Props = $props();` line.)

- [ ] **Step 2: Add isDirty tracking and saving state**

After the existing `let valid = $derived(...)`:

```ts
const initialSnapshot = {
  height: initial?.height ?? 168,
  weight: initial?.weight ?? 74,
  age: initial?.age ?? 30,
  gender: initial?.gender ?? 'female',
  activity: initial?.activity ?? 1.2,
};
let snapshot = $state({ ...initialSnapshot });

let isDirty = $derived(
  height !== snapshot.height ||
    weight !== snapshot.weight ||
    age !== snapshot.age ||
    gender !== snapshot.gender ||
    activity !== snapshot.activity,
);

// Onboarding (no `initial`) treats every submission as dirty.
let canSubmit = $derived(valid && (initial === null || isDirty));

let saving = $state(false);
```

- [ ] **Step 3: Make `submit` async, await `onSubmit`, reset snapshot**

Replace the existing `submit` function:

```ts
async function submit(): Promise<void> {
  if (!canSubmit || saving) return;
  saving = true;
  try {
    await onSubmit({ height, weight, gender, age, activity });
    snapshot = { height, weight, age, gender, activity };
  } finally {
    saving = false;
  }
}
```

- [ ] **Step 4: Update the submit button**

Replace the submit button:

```svelte
<button
  type="submit"
  class="bg-accent mt-4 min-h-14 rounded-lg px-6 py-4 text-lg font-semibold text-white shadow-md shadow-black/20 transition-opacity disabled:opacity-50"
  disabled={!canSubmit || saving}
>
  {#if saving}
    …
  {:else if initial !== null && isDirty && dirtyLabel}
    {dirtyLabel}
  {:else}
    {submitLabel}
  {/if}
</button>
```

- [ ] **Step 5: Add `inputmode` / `enterkeyhint` to numeric inputs**

For the **height** input, replace:

```svelte
<input
  type="number"
  class="text-fg rounded-lg border border-white/10 bg-transparent px-4 py-4 text-lg"
  min="120"
  max="230"
  bind:value={height}
/>
```

with:

```svelte
<input
  type="number"
  inputmode="numeric"
  enterkeyhint="next"
  autocomplete="off"
  class="text-fg rounded-lg border border-white/10 bg-transparent px-4 py-4 text-lg"
  min="120"
  max="230"
  bind:value={height}
/>
```

For the **weight** input, replace:

```svelte
<input
  type="number"
  class="text-fg rounded-lg border border-white/10 bg-transparent px-4 py-4 text-lg"
  min="30"
  max="250"
  step="0.1"
  bind:value={weight}
/>
```

with:

```svelte
<input
  type="number"
  inputmode="decimal"
  enterkeyhint="next"
  autocomplete="off"
  class="text-fg rounded-lg border border-white/10 bg-transparent px-4 py-4 text-lg"
  min="30"
  max="250"
  step="0.1"
  bind:value={weight}
/>
```

For the **age** input, replace:

```svelte
<input
  type="number"
  class="text-fg rounded-lg border border-white/10 bg-transparent px-4 py-4 text-lg"
  min="12"
  max="100"
  bind:value={age}
/>
```

with:

```svelte
<input
  type="number"
  inputmode="numeric"
  enterkeyhint="done"
  autocomplete="off"
  class="text-fg rounded-lg border border-white/10 bg-transparent px-4 py-4 text-lg"
  min="12"
  max="100"
  bind:value={age}
/>
```

(All three already use `text-lg`, which is `1.125rem ≈ 18px > 16px` — iOS won't zoom on focus.)

- [ ] **Step 6: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProfileForm.svelte
git commit -m "feat(profile): isDirty tracking, save-changes label, numeric inputmode"
```

---

### Task 10: Profile route — targets pulse card + recalc toast

**Files:**

- Modify: `src/routes/Profile.svelte`

- [ ] **Step 1: Replace the `<script>` block**

```svelte
<script lang="ts">
  import { profile } from '$state/profile.svelte';
  import ProfileForm from '../components/ProfileForm.svelte';
  import TelegramUserHeader from '../components/TelegramUserHeader.svelte';
  import { celebrate } from '$lib/anim';
  import { dailyTargets } from '$lib/scaling';
  import type { ProfileInput } from '$types/profile';

  let targetsEl = $state<HTMLDivElement | undefined>(undefined);
  let savedAt = $state<number | null>(null);

  async function save(input: ProfileInput): Promise<void> {
    await profile.save(input);
    savedAt = Date.now();
    if (targetsEl) celebrate(targetsEl);
  }

  let savedRecently = $derived(savedAt !== null && Date.now() - savedAt < 2500);
  let targets = $derived(profile.value ? dailyTargets(profile.value) : null);
</script>
```

(Diff vs current: import `TelegramUserHeader`, `celebrate`, `dailyTargets`; rename `formEl` → `targetsEl`; trim toast window 3000 → 2500ms; expose `targets`.)

- [ ] **Step 2: Replace the markup**

```svelte
<section class="mx-auto max-w-md p-3 md:p-6">
  <TelegramUserHeader />

  <div class="mb-5 flex items-baseline justify-between">
    <h2 class="text-xl font-semibold">Профіль</h2>
    {#if profile.value}
      <span class="text-muted text-sm tabular-nums">k = {profile.value.k_factor.toFixed(2)}</span>
    {/if}
  </div>

  {#if targets}
    <div
      bind:this={targetsEl}
      class="mb-5 grid grid-cols-4 gap-2 rounded-lg border border-white/10 p-3 text-center"
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

  <p class="text-muted mb-4 text-sm">
    Зміна параметрів перерахує норми для всіх майбутніх днів. Існуючі записи журналу не змінюються.
  </p>

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

(Diff vs current: removed the `bind:this={formEl}` wrapper around `<ProfileForm />`; added the targets card with `bind:this={targetsEl}`; passed `dirtyLabel="Зберегти зміни"`; toast text replaced.)

- [ ] **Step 3: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Profile.svelte
git commit -m "feat(profile): targets card with celebrate-on-save and recalc toast"
```

---

### Task 11: Telegram `disableVerticalSwipes` in `main.ts`

**Files:**

- Modify: `src/main.ts`

- [ ] **Step 1: Call `disableVerticalSwipes` after expand**

In `src/main.ts`, change the body of `applyTelegramTheme` from:

```ts
function applyTelegramTheme(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  const t = tg.themeParams;
  ...
}
```

to:

```ts
function applyTelegramTheme(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
  const t = tg.themeParams;
  ...
}
```

(Only addition: the `tg.disableVerticalSwipes?.();` line. Optional-chained — degrades silently on TG <7.7.)

- [ ] **Step 2: Verify**

Run: `command pnpm run check && command pnpm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "chore(ui): disable Telegram vertical swipes when available"
```

---

### Task 12: Manual verification pass on real viewports

This task contains no code changes. It runs the dev server and walks the spec's verification checklist on each viewport.

**Files:** none.

- [ ] **Step 1: Start the dev server**

Run: `command pnpm run dev`
Expected: Vite prints a local URL (typically `http://localhost:5173`).

- [ ] **Step 2: Open Chrome DevTools device toolbar and add custom viewports**

- iPhone 14 Pro Max — 430 × 932 (DPR 3)
- Galaxy S25 — 393 × 852 (DPR 3)
- iPhone SE (sanity) — 375 × 667 (DPR 2)

- [ ] **Step 3: For each viewport, verify the spec checklist**

Walk through each item from the spec's "Verification" section:

1. No vertical scrollbar on body or `<main>`; `<main>` scrolls smoothly.
2. No horizontal scrollbar anywhere; nothing clipped that shouldn't be.
3. DateStrip stays pinned at top while scrolling Journal/Dashboard.
4. BottomNav stays pinned at bottom; safe-area inset present below it.
5. Tap any date on any tab → switches to Dashboard with that date active.
6. Active nav item: BottomNav pill + accent + (filled if reads well); SideNav left-border + accent.
7. Profile: load → Save disabled. Edit a field → Save enables, label "Зберегти зміни". Save → Save disables, targets pulse, "Цілі оновлено за новим профілем" appears for ~2.5s. Edit back to original → Save disables, no save fires.
8. Open EntrySheet → swipe inside doesn't scroll page beneath.
9. Focus a numeric input → no zoom, no layout reflow, input visible above the keyboard.
10. Switch tabs → `<main>` resets to top each time.
11. Profile in dev browser shows "Одрі" + rounded `logo.png`. (Telegram phone test optional but encouraged.)

- [ ] **Step 4: If any check fails, fix it and re-verify**

If `fill-current` icons look wrong on BottomNav, drop the class (Task 5, Step 1):

```svelte
<Icon size={22} />
```

(Pill + accent color is the primary signal anyway.)

If DateStrip cells still overflow on 393px, reduce `gap-1` to `gap-0` on the row container, or shrink the prev/next buttons' `px-3` to `px-2`.

- [ ] **Step 5: Stop the dev server (Ctrl+C) and commit any QA-driven fixes**

```bash
# only if Step 4 produced changes
git add -A
git commit -m "fix(ui): QA fixes from manual verification pass"
```

---

## Self-review

**Spec coverage:**

| Spec section                                      | Task                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| App-shell architecture (root layout)              | Task 2                                                                                |
| Route store                                       | Task 1                                                                                |
| Scroll & overflow (no scrollbars, body lock, dvh) | Task 2                                                                                |
| EntrySheet dvh + overscroll-contain               | Task 3                                                                                |
| Sticky chrome                                     | Task 2 (structural)                                                                   |
| Date tap → Dashboard                              | Task 4                                                                                |
| DateStrip overflow audit                          | Task 4                                                                                |
| Active-item highlight                             | Task 5                                                                                |
| Profile dirty tracking + save states              | Task 9                                                                                |
| Targets card pulse + recalc toast                 | Task 10                                                                               |
| Telegram user header (incl. Одрі guest)           | Tasks 7, 8                                                                            |
| Scroll-to-top on route change                     | Task 6                                                                                |
| Tap targets ≥ 44                                  | Task 4 (DateStrip), Task 9 (form already has min-h-14) — verified visually in Task 12 |
| Safe areas (top/bottom/left/right)                | Task 2 (CSS) + DateStrip already has top + BottomNav already has bottom               |
| Telegram disableVerticalSwipes                    | Task 11                                                                               |
| Inputs (inputmode/enterkeyhint/font-size)         | Task 9                                                                                |
| Keyboard handling (scroll-padding-bottom)         | Task 2                                                                                |
| Body lock touch-action                            | Task 2                                                                                |
| No pull-to-refresh                                | Task 2 (overscroll-behavior:none)                                                     |
| Theming (unchanged)                               | n/a                                                                                   |

All spec sections covered.

**Placeholder scan:** No "TBD", "TODO", "fill in", or "similar to Task N" references. Every code step contains complete code.

**Type consistency:**

- `activeRoute` exposes `.value` getter and `.set(...)` method consistently across Tasks 1, 4, 6.
- `getTelegramUser()` returns `TelegramWebAppUser | null` consistently across Tasks 7, 8.
- `ProfileForm` `onSubmit` signature change `(input) => void` → `(input) => Promise<void> | void` is backward-compatible with `StepMeasurements.svelte` which passes `(input) => void` (compatible, since the union accepts `void`). Verified by `pnpm run check` gate in Task 9.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-28-mobile-ui-fixes.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

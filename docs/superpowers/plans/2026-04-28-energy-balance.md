# Energy Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily energy-balance (food intake − BMR + step kcal + training kcal) with a Dashboard pill, a Stats summary row, and a 90-day balance strip in the heatmap. Replace the single `strength` boolean with a 3-slot training counter.

**Architecture:** A new `src/lib/energy.ts` module owns formulas. `src/state/activity.svelte.ts` migrates `strength: boolean` → `trainings: 0|1|2|3` with a load-time translator. A new `EnergyBalanceRow.svelte` renders compact (Dashboard) and full (Stats) variants. `Heatmap.svelte` extends to load `activity_*` keys and renders a per-day balance strip below the existing quota grid.

**Tech Stack:** Svelte 5 runes, TypeScript, Tailwind v4. No new dependencies. No new tests. Verification: `command pnpm run check`, `lint`, `build`, plus manual viewport pass.

**Spec:** `docs/superpowers/specs/2026-04-28-energy-balance-design.md`

---

## File map

| File                                     | Action | Responsibility                                                                                                                                               |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/energy.ts`                      | create | `bmr`, `stepKcal`, `trainingKcal`, `actualBurn`, `energyBalance` + `BalanceState` / `EnergyBalance` types + `KCAL_PER_TRAINING` / `NEUTRAL_BAND_KCAL` consts |
| `src/state/activity.svelte.ts`           | modify | Schema migrates `strength` → `trainings` (0..3); adds `setTrainings`, `tickTraining`; removes `toggleStrength`                                               |
| `src/routes/Activity.svelte`             | modify | Strength toggle replaced with 3 training tiles + footer                                                                                                      |
| `src/components/EnergyBalanceRow.svelte` | create | Compact / full variants; reads profile + activity + dailyLog                                                                                                 |
| `src/routes/Dashboard.svelte`            | modify | Mount `<EnergyBalanceRow />` spanning the grid above category cards                                                                                          |
| `src/routes/Stats.svelte`                | modify | Mount `<EnergyBalanceRow variant="full" />` above DailyTotals                                                                                                |
| `src/components/Heatmap.svelte`          | modify | Load `activity_*`, compute per-day balance, render strip + 2-section legend                                                                                  |

No other files. No deps, data, or test changes.

---

## Conventions

- `command pnpm run check && command pnpm run lint` after each task. Both 0/0.
- Pre-commit hooks run prettier + svelte-check + eslint. If `git commit` fails on GPG signing, retry with `dangerouslyDisableSandbox: true`.
- Tailwind class strings post-prettier may be reordered alphabetically — fine if required tokens are present.
- One commit per task.

---

### Task 1: `src/lib/energy.ts` — formulas + types

**File:** Create `src/lib/energy.ts`

- [ ] **Step 1: Create the file**

```ts
import type { ProfileInput } from '$types/profile';
import type { DayActivity } from '$state/activity.svelte';

export const KCAL_PER_TRAINING = 120;
export const NEUTRAL_BAND_KCAL = 100;

// Mifflin-St Jeor.
export function bmr(p: ProfileInput): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}

// Pedometer formula tuned to MET-based walking research:
// at 70 kg ≈ 35 kcal per 1000 steps.
export function stepKcal(steps: number, weightKg: number): number {
  return steps * weightKg * 0.0005;
}

export function trainingKcal(trainings: number): number {
  return trainings * KCAL_PER_TRAINING;
}

export function actualBurn(p: ProfileInput, a: DayActivity): number {
  return Math.round(bmr(p) + stepKcal(a.steps, p.weight) + trainingKcal(a.trainings));
}

export type BalanceState = 'deficit' | 'balanced' | 'surplus';

export interface EnergyBalance {
  burn: number;
  intake: number;
  delta: number;
  state: BalanceState;
}

export function energyBalance(intakeKcal: number, burnKcal: number): EnergyBalance {
  const delta = Math.round(intakeKcal - burnKcal);
  let state: BalanceState;
  if (delta < -NEUTRAL_BAND_KCAL) state = 'deficit';
  else if (delta > NEUTRAL_BAND_KCAL) state = 'surplus';
  else state = 'balanced';
  return { burn: Math.round(burnKcal), intake: Math.round(intakeKcal), delta, state };
}
```

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

`energy.ts` imports `DayActivity` from `$state/activity.svelte` — that type doesn't have `trainings` yet (Task 2 will add it). Expected: a type error on `actualBurn`'s `a.trainings` access.

To unblock Task 1, this task ends BEFORE the `actualBurn` line is exercised. Pre-create the import as `import type { DayActivity } from '$state/activity.svelte';` — TypeScript will resolve it as the current shape (with `strength: boolean`). Replace the `actualBurn` body with a stub that doesn't access `a.trainings` yet:

```ts
export function actualBurn(p: ProfileInput, a: DayActivity): number {
  return Math.round(bmr(p) + stepKcal(a.steps, p.weight)); // trainings added in Task 2
}
```

After Task 2 completes the schema migration, Task 3 will restore the full body.

- [ ] **Step 3: Commit**

```bash
git add src/lib/energy.ts
git commit -m "feat(energy): add energy formulas (bmr, stepKcal, trainingKcal, energyBalance)"
```

---

### Task 2: `activity` store — migrate to `trainings`

**File:** `src/state/activity.svelte.ts`

- [ ] **Step 1: Replace the file's contents**

```ts
import { storage } from '$lib/storage';
import { debounce } from '$lib/debounce';

export interface DayActivity {
  steps: number;
  trainings: 0 | 1 | 2 | 3;
}

interface LegacyActivity {
  steps?: number;
  strength?: boolean;
  trainings?: 0 | 1 | 2 | 3;
}

const EMPTY: DayActivity = { steps: 0, trainings: 0 };

function migrate(raw: LegacyActivity | null): DayActivity {
  if (!raw) return { ...EMPTY };
  const steps = Math.max(0, Math.round(raw.steps ?? 0));
  if (typeof raw.trainings === 'number') {
    const t = Math.max(0, Math.min(3, raw.trainings));
    return { steps, trainings: t as 0 | 1 | 2 | 3 };
  }
  if (raw.strength === true) return { steps, trainings: 1 };
  return { steps, trainings: 0 };
}

let _activity = $state<DayActivity>({ ...EMPTY });
let _date = $state<string>('');

const persist = debounce(() => {
  void storage.save(`activity_${_date}`, _activity);
}, 500);

export const activity = {
  get value(): DayActivity {
    return _activity;
  },
  get date(): string {
    return _date;
  },

  async load(this: void, date: string): Promise<void> {
    _date = date;
    const raw = await storage.load<LegacyActivity | null>(`activity_${date}`, null);
    _activity = migrate(raw);
  },

  setSteps(this: void, steps: number): void {
    _activity = { ..._activity, steps: Math.max(0, Math.round(steps)) };
    persist();
  },

  setTrainings(this: void, trainings: 0 | 1 | 2 | 3): void {
    _activity = { ..._activity, trainings };
    persist();
  },

  tickTraining(this: void, slot: 0 | 1 | 2): void {
    const slotOneIndexed = slot + 1; // 1, 2, or 3
    const current = _activity.trainings;
    const next: 0 | 1 | 2 | 3 =
      current < slotOneIndexed
        ? (slotOneIndexed as 0 | 1 | 2 | 3)
        : ((slotOneIndexed - 1) as 0 | 1 | 2 | 3);
    _activity = { ..._activity, trainings: next };
    persist();
  },
};

/** Step count target — Public-health "active lifestyle" baseline. */
export const STEP_TARGET = 7000;
```

(Diff vs current: `strength: boolean` removed; `trainings: 0|1|2|3` added; `EMPTY` updated; `migrate` translator added; `setTrainings` + `tickTraining` exported; `toggleStrength` removed; `load` calls `migrate`.)

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: failures in `src/routes/Activity.svelte` because that file still references the old `activity.toggleStrength()` and `activity.value.strength`. We'll fix in Task 3, where Activity is rewritten to use `tickTraining` / `trainings`.

If those errors are the ONLY ones, this task is OK to commit (broken state is intentional for a one-step refactor). If there are unexpected unrelated errors, stop and investigate.

- [ ] **Step 3: Commit**

```bash
git add src/state/activity.svelte.ts
git commit -m "feat(state): migrate activity.strength to activity.trainings (0..3)"
```

---

### Task 3: Restore `actualBurn` + rewrite Activity UI

**Files:** `src/lib/energy.ts`, `src/routes/Activity.svelte`

- [ ] **Step 1: Restore `actualBurn` body in `src/lib/energy.ts`**

Replace the stub `actualBurn` (Task 1 left it without `trainingKcal`) with:

```ts
export function actualBurn(p: ProfileInput, a: DayActivity): number {
  return Math.round(bmr(p) + stepKcal(a.steps, p.weight) + trainingKcal(a.trainings));
}
```

- [ ] **Step 2: Replace the strength card in `src/routes/Activity.svelte`**

Read `src/routes/Activity.svelte`. Find the `<!-- Strength training toggle -->` block and replace from that comment through the closing `</button>` of the toggle (about 20 lines) with:

```svelte
<!-- Trainings (3 light sessions) -->
<div class="border-border bg-surface-2 rounded-xl border p-5 md:col-start-2 md:row-start-2">
  <div class="text-muted mb-3 flex items-center gap-2 text-sm">
    <Dumbbell size={18} />
    Тренування
  </div>
  <div class="grid grid-cols-3 gap-3">
    {#each [1, 2, 3] as slot (slot)}
      {@const ticked = activity.value.trainings >= slot}
      <button
        type="button"
        class={[
          'flex min-h-16 flex-col items-center justify-center rounded-lg border transition-colors',
          ticked
            ? 'border-ok bg-ok/10 text-ok'
            : 'border-border bg-surface text-muted hover:bg-surface-2',
        ]}
        aria-pressed={ticked}
        onclick={() => activity.tickTraining((slot - 1) as 0 | 1 | 2)}
      >
        <Dumbbell size={20} />
        <span class="mt-1 text-xs font-semibold tabular-nums">{slot}</span>
      </button>
    {/each}
  </div>
  {#if activity.value.trainings > 0}
    <p class="text-muted mt-3 text-xs">+{activity.value.trainings * 120} ккал сьогодні</p>
  {/if}
</div>
```

(`md:col-start-2 md:row-start-2` keeps the desktop 2-col layout from the previous desktop-polish work — the steps card auto-occupies col 1 row 2; this card sits next to it.)

In the `<script>` block, drop the `Check` import: change `import { Footprints, Dumbbell, Check } from '@lucide/svelte';` to `import { Footprints, Dumbbell } from '@lucide/svelte';`.

- [ ] **Step 3: Verify**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

Expected: 0 errors / 0 warnings / build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/energy.ts src/routes/Activity.svelte
git commit -m "feat(activity): 3 training tiles replace strength toggle"
```

---

### Task 4: `EnergyBalanceRow.svelte` — both variants

**File:** Create `src/components/EnergyBalanceRow.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import { TrendingDown, TrendingUp, Equal } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { activity } from '$state/activity.svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { sumMacros } from '$lib/macros';
  import { actualBurn, energyBalance, type BalanceState } from '$lib/energy';

  interface Props {
    variant?: 'compact' | 'full';
  }
  let { variant = 'compact' }: Props = $props();

  let balance = $derived.by(() => {
    if (!profile.value) return null;
    const intake = sumMacros(dailyLog.entries, personalizedDb()).kcal;
    const burn = actualBurn(profile.value, activity.value);
    return energyBalance(intake, burn);
  });

  const STATE_CLASSES: Record<BalanceState, { wrap: string; fg: string; bar: string }> = {
    deficit: {
      wrap: 'bg-accent/10 border-accent/20',
      fg: 'text-accent',
      bar: 'bg-accent',
    },
    balanced: {
      wrap: 'bg-surface-2 border-border',
      fg: 'text-muted',
      bar: 'bg-muted',
    },
    surplus: {
      wrap: 'bg-warn/10 border-warn/30',
      fg: 'text-warn',
      bar: 'bg-warn',
    },
  };

  const STATE_LABEL: Record<BalanceState, string> = {
    deficit: 'Дефіцит',
    balanced: 'Баланс',
    surplus: 'Профіцит',
  };

  function fmtSigned(n: number): string {
    if (n === 0) return '0';
    return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
  }

  // Mini-bar fills proportionally, capped at 500 kcal magnitude.
  function barWidthPct(delta: number): number {
    return Math.min(Math.abs(delta) / 500, 1) * 100;
  }
</script>

{#if balance}
  {@const cls = STATE_CLASSES[balance.state]}
  {@const Icon =
    balance.state === 'deficit' ? TrendingDown : balance.state === 'surplus' ? TrendingUp : Equal}

  {#if variant === 'compact'}
    <div
      class={[
        'flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
        cls.wrap,
      ]}
    >
      <Icon size={20} class={cls.fg} />
      <span class={['text-2xl font-bold tabular-nums', cls.fg]}>
        {fmtSigned(balance.delta)}
      </span>
      <span class="text-muted text-xs">ккал</span>
      <div class="bg-surface-2/60 ml-auto flex h-1.5 w-24 overflow-hidden rounded-full">
        <div class="flex w-1/2 justify-end">
          {#if balance.delta < 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
        <div class="flex w-1/2 justify-start">
          {#if balance.delta > 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div
      class={[
        'flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        cls.wrap,
      ]}
    >
      <Icon size={22} class={cls.fg} />
      <span class={['text-base font-semibold', cls.fg]}>{STATE_LABEL[balance.state]}</span>
      <span class={['text-2xl font-bold tabular-nums', cls.fg]}>
        {fmtSigned(balance.delta)}
      </span>
      <span class="text-muted text-xs">ккал</span>
      <div class="bg-surface-2/60 mx-2 flex h-2 w-40 overflow-hidden rounded-full">
        <div class="flex w-1/2 justify-end">
          {#if balance.delta < 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
        <div class="flex w-1/2 justify-start">
          {#if balance.delta > 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
      </div>
      <span class="text-muted ml-auto text-sm tabular-nums">
        {balance.intake} / {balance.burn} ккал
      </span>
    </div>
  {/if}
{/if}
```

- [ ] **Step 2: Verify**

```bash
command pnpm run check && command pnpm run lint
```

Expected: 0 / 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/EnergyBalanceRow.svelte
git commit -m "feat(ui): EnergyBalanceRow component (compact + full variants)"
```

---

### Task 5: Mount `EnergyBalanceRow` on Dashboard + Stats

**Files:** `src/routes/Dashboard.svelte`, `src/routes/Stats.svelte`

- [ ] **Step 1: Dashboard**

In `src/routes/Dashboard.svelte`, add the import and a wrapper div spanning the grid:

```svelte
<script lang="ts">
  import { personalizedDb } from '$state/personalizedDb';
  import { categoryConsumed } from '$state/dailyLog.svelte';
  import { CATEGORY_KEYS } from '$types/food';
  import CategoryCard from '../components/CategoryCard.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import EntrySheet from '../components/EntrySheet.svelte';
  import type { CategoryKey } from '$types/food';

  let sheetOpen = $state(false);
  let activeCat = $state<CategoryKey | null>(null);

  function openSheet(key: CategoryKey): void {
    activeCat = key;
    sheetOpen = true;
  }
</script>

<section class="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:grid-cols-4 md:gap-4 md:p-4">
  <div class="col-span-1 sm:col-span-2 md:col-span-4">
    <EnergyBalanceRow />
  </div>
  {#each CATEGORY_KEYS as key (key)}
    <CategoryCard
      categoryKey={key}
      title={personalizedDb()[key].title}
      color={personalizedDb()[key].color}
      consumed={categoryConsumed()[key]}
      onClick={openSheet}
    />
  {/each}
</section>

<EntrySheet bind:open={sheetOpen} categoryKey={activeCat} />
```

(Diff: `import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';` added; new `<div class="col-span-1 sm:col-span-2 md:col-span-4"><EnergyBalanceRow /></div>` as the first grid child.)

- [ ] **Step 2: Stats**

In `src/routes/Stats.svelte`, add the import and mount the full variant above DailyTotals:

```svelte
<script lang="ts">
  import DailyTotals from '../components/DailyTotals.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import Heatmap from '../components/Heatmap.svelte';
  import CategoryBarChart from '../components/CategoryBarChart.svelte';
</script>

<section class="flex flex-col gap-4 p-2 md:p-4">
  <EnergyBalanceRow variant="full" />
  <DailyTotals />
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <Heatmap />
    <CategoryBarChart />
  </div>
</section>
```

(Diff: import added; `<EnergyBalanceRow variant="full" />` inserted as first child.)

- [ ] **Step 3: Verify**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Dashboard.svelte src/routes/Stats.svelte
git commit -m "feat(ui): mount EnergyBalanceRow on Dashboard and Stats"
```

---

### Task 6: Heatmap balance strip

**File:** `src/components/Heatmap.svelte`

This task extends the heatmap to also load `activity_*` records and render a per-day balance strip below the existing 7-row quota grid.

- [ ] **Step 1: Read the current `Heatmap.svelte`**

```bash
cat src/components/Heatmap.svelte
```

- [ ] **Step 2: Replace the entire file with the extended version**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { storage } from '$lib/storage';
  import { addDays, dateFromKey, isLogKey, todayKey } from '$lib/date';
  import { profile } from '$state/profile.svelte';
  import { sumMacros } from '$lib/macros';
  import { personalizedDb } from '$state/personalizedDb';
  import { actualBurn, energyBalance, type BalanceState } from '$lib/energy';
  import type { DayActivity } from '$state/activity.svelte';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  // 0 = no data, 1 = clean, 2 = some over (1-2 categories), 3 = many over (3+)
  type DayVerdict = 0 | 1 | 2 | 3;
  type BalanceVerdict = 'none' | BalanceState;

  const VERDICT_COLOR: Record<DayVerdict, string> = {
    0: 'rgba(255,255,255,0.06)',
    1: '#86efac',
    2: '#fbbf24',
    3: '#ef4444',
  };
  const VERDICT_LABEL: Record<DayVerdict, string> = {
    0: 'Без даних',
    1: 'У межах норм',
    2: '1–2 перевищення',
    3: '3+ перевищення',
  };
  const LEGEND_VERDICTS: DayVerdict[] = [1, 2, 3];

  const BALANCE_COLOR: Record<BalanceVerdict, string> = {
    none: 'rgba(255,255,255,0.06)',
    deficit: 'var(--color-accent)',
    balanced: 'var(--color-muted)',
    surplus: 'var(--color-warn)',
  };
  const BALANCE_LABEL: Record<BalanceVerdict, string> = {
    none: 'Без даних',
    deficit: 'Дефіцит',
    balanced: 'Баланс',
    surplus: 'Профіцит',
  };
  const LEGEND_BALANCES: BalanceVerdict[] = ['deficit', 'balanced', 'surplus'];

  const DAYS = 90;
  let verdictByKey = $state<Record<string, DayVerdict>>({});
  let balanceByKey = $state<Record<string, BalanceVerdict>>({});
  let loaded = $state(false);

  function dayVerdict(entries: LogEntry[]): DayVerdict {
    if (entries.length === 0) return 0;
    const sums: Record<CategoryKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
      G: 0,
      H: 0,
    };
    for (const e of entries) sums[e.cat] += e.pct;
    const overCount = Object.values(sums).filter((v) => v > 100).length;
    if (overCount === 0) return 1;
    if (overCount <= 2) return 2;
    return 3;
  }

  onMount(async () => {
    const allKeys = await storage.keys();
    const logKeys = allKeys.filter(isLogKey);
    const verdicts: Record<string, DayVerdict> = {};
    const balances: Record<string, BalanceVerdict> = {};

    await Promise.all(
      logKeys.map(async (k) => {
        const date = k.slice(4); // strip "log_"
        const entries = await storage.load<LogEntry[]>(k, []);
        verdicts[date] = dayVerdict(entries);

        if (profile.value && entries.length > 0) {
          const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
            steps: 0,
            trainings: 0,
          });
          const intake = sumMacros(entries, personalizedDb()).kcal;
          const burn = actualBurn(profile.value, dayAct);
          balances[date] = energyBalance(intake, burn).state;
        } else {
          balances[date] = 'none';
        }
      }),
    );
    verdictByKey = verdicts;
    balanceByKey = balances;
    loaded = true;
  });

  interface Cell {
    key: string;
    verdict: DayVerdict;
    balance: BalanceVerdict;
  }

  let cells = $derived.by<(Cell | null)[]>(() => {
    const today = todayKey();
    const days: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) days.push(addDays(today, -i));
    const firstKey = days[0] ?? today;
    const firstDow = (dateFromKey(firstKey).getDay() + 6) % 7;
    const out: (Cell | null)[] = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (const d of days) {
      out.push({
        key: d,
        verdict: verdictByKey[d] ?? 0,
        balance: balanceByKey[d] ?? 'none',
      });
    }
    return out;
  });

  // Per-day balance strip uses just the date sequence (no padding row needed).
  let balanceCells = $derived.by<{ key: string; balance: BalanceVerdict }[]>(() => {
    const today = todayKey();
    const out: { key: string; balance: BalanceVerdict }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      out.push({ key: d, balance: balanceByKey[d] ?? 'none' });
    }
    return out;
  });
</script>

<div class="border-border rounded-md border p-3">
  <h3 class="mb-2 text-sm font-semibold">Останні {DAYS} днів</h3>
  {#if loaded}
    <div class="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
      {#each cells as cell, i (cell?.key ?? `pad-${i}`)}
        {#if cell === null}
          <div class="h-3 w-3"></div>
        {:else}
          <div
            class="h-3 w-3 rounded-sm"
            style="background: {VERDICT_COLOR[cell.verdict]};"
            title="{cell.key}: {VERDICT_LABEL[cell.verdict]}"
          ></div>
        {/if}
      {/each}
    </div>

    <h4 class="text-muted mt-3 mb-2 text-xs font-semibold tracking-wider uppercase">
      Енергобаланс
    </h4>
    <div class="flex gap-1 overflow-x-auto">
      {#each balanceCells as cell (cell.key)}
        <div
          class="h-3 w-3 shrink-0 rounded-sm"
          style="background: {BALANCE_COLOR[cell.balance]};"
          title="{cell.key}: {BALANCE_LABEL[cell.balance]}"
        ></div>
      {/each}
    </div>

    <div class="text-muted mt-3 flex flex-wrap items-center gap-3 text-xs">
      {#each LEGEND_VERDICTS as v (v)}
        <span class="flex items-center gap-1">
          <span class="h-3 w-3 rounded-sm" style="background: {VERDICT_COLOR[v]};"></span>
          {VERDICT_LABEL[v]}
        </span>
      {/each}
    </div>
    <div class="text-muted mt-1 flex flex-wrap items-center gap-3 text-xs">
      {#each LEGEND_BALANCES as b (b)}
        <span class="flex items-center gap-1">
          <span class="h-3 w-3 rounded-sm" style="background: {BALANCE_COLOR[b]};"></span>
          {BALANCE_LABEL[b]}
        </span>
      {/each}
    </div>
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>
```

(Diff: imports added (`profile`, `sumMacros`, `personalizedDb`, `actualBurn`, `energyBalance`, `BalanceState`, `DayActivity`); types `BalanceVerdict` etc. added; `BALANCE_COLOR` / `BALANCE_LABEL` / `LEGEND_BALANCES` consts added; `balanceByKey` state; `onMount` extended to load `activity_${date}` per log key and compute balance; new `balanceCells` derived; new strip + heading + balance legend in the markup.)

- [ ] **Step 3: Verify**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/Heatmap.svelte
git commit -m "feat(stats): heatmap shows per-day energy-balance strip below quota grid"
```

---

### Task 7: Manual verification

No code changes.

- [ ] **Step 1: Build sanity**

```bash
command pnpm run check && command pnpm run lint && command pnpm run build
```

All clean.

- [ ] **Step 2: Computational sanity in dev console**

Start `command pnpm run dev`. Open the app. With profile 70/168/30/female/1.2:

- Empty day (0 steps, 0 trainings, 0 kcal eaten): Dashboard pill shows large negative delta `−1439` ккал, deficit color (accent tint).
- Add 8000 steps + 1 training: Dashboard pill shows `−1839` ккал if no food yet, still deficit.
- Add food until ~1750 kcal eaten: pill state flips to `balanced`.
- Eat past ~2000 kcal: flips to `surplus` (warn tint).

- [ ] **Step 3: Activity tile interactions**

On Activity route:

- Trainings = 0 → tap slot 2 → trainings becomes 2 (slots 1 and 2 ticked, slot 3 unticked).
- Trainings = 2 → tap slot 1 → trainings becomes 1.
- Trainings = 1 → tap slot 3 → trainings becomes 3 (all three).
- Footer "+N ккал" updates live.

- [ ] **Step 4: Migration check**

Open DevTools → IndexedDB → localforage. Manually create an entry under the active storage with key `activity_2026-04-27` and value `{"steps":5000,"strength":true}`. Switch the date in the app to `2026-04-27`. Confirm the activity tab shows trainings = 1 (slot 1 ticked). Tick slot 2 → in storage the record updates to `{"steps":5000,"trainings":2}` (no `strength` field).

- [ ] **Step 5: Heatmap strip**

On Stats route, scroll to the heatmap. Confirm:

- The 7-row quota grid renders as before.
- Below it, a "Енергобаланс" heading + 1-row strip of 90 cells.
- Past days with logged food + a profile show colored cells (accent / muted / warn).
- Past days without log entries show low-opacity neutral.
- Two legend rows at the bottom (quota colors + balance colors).

- [ ] **Step 6: Light + dark theme**

Toggle theme via DevTools "Emulate prefers-color-scheme". All three balance colors readable in both modes; no color collapses to invisible.

- [ ] **Step 7: If any check fails, fix and commit**

```bash
git add -A
git commit -m "fix(ui): QA fixes from energy-balance verification"
```

---

## Self-review

**Spec coverage:**

| Spec section               | Task                                     |
| -------------------------- | ---------------------------------------- |
| Energy formulas            | Task 1 (+ Task 3 restoring `actualBurn`) |
| Activity migration         | Task 2                                   |
| Activity 3-tile UI         | Task 3                                   |
| EnergyBalanceRow component | Task 4                                   |
| Dashboard mount            | Task 5                                   |
| Stats mount                | Task 5                                   |
| Heatmap balance strip      | Task 6                                   |
| Manual verification        | Task 7                                   |

All spec sections covered.

**Placeholder scan:** No TBDs / TODOs / "fill in details". Every code step shows the actual code to apply.

**Type consistency:**

- `BalanceState = 'deficit' | 'balanced' | 'surplus'` and `BalanceVerdict = 'none' | BalanceState` are consistent across `energy.ts`, `EnergyBalanceRow.svelte`, and `Heatmap.svelte`.
- `DayActivity = { steps: number; trainings: 0|1|2|3 }` is the new shape used everywhere after Task 2.
- `tickTraining(slot: 0|1|2)` (zero-indexed) and the UI passing `slot - 1` (where slot is 1-indexed in the loop) match.
- `actualBurn(p, a)` signature is stable from Task 1 onward (Task 1 stub = Task 3 final, only the body differs).

---

## Execution Handoff

Plan saved. Auto-mode active — proceeding to subagent-driven implementation.

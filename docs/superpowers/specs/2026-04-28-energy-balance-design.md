# Energy Balance (Deficit / Surplus) — Design

Date: 2026-04-28
Status: Approved (auto-mode execution)
Scope: Telegram mini app + PWA, mobile + desktop.

## Goals

1. Compute the user's daily energy balance (food intake − total burn) using BMR, actual steps, and a new 3-slot light-training counter.
2. Show today's balance state on the **Dashboard** as a minimal visual pill (tinted bg + signed delta + proportional mini-bar). Visualization-first, label-light.
3. Show the same balance, fuller, on the **Stats** page (icon + Ukrainian label + signed delta + intake/burn breakdown).
4. Encode per-day balance state for the last 90 days as a **strip of colored cells** below the existing quota heatmap.
5. Replace the existing single `strength: boolean` toggle with a **3-tile training counter** (each tile = ~120 kcal, easy session). Migrate old data on load.

## Non-goals

- Goal awareness (no `goal: lose | maintain | gain` field). Display is neutral; user interprets.
- Replacing the macro target system. The existing `dailyTargets` (BMR × activity_factor) stays as the user's expected average intake; the new metric is independent.
- Editing past activity records retroactively. Heatmap uses _current_ `profile.value` for snapshot calculations of historical days — acceptable approximation.
- New dependencies, new tests.

## Approach

A new `src/lib/energy.ts` module owns the formulas — public `bmr`, `stepKcal`, `trainingKcal`, `actualBurn`, `energyBalance`. `scaling.ts` (macro targets) is unchanged.

Activity store schema migrates from `{ steps, strength }` to `{ steps, trainings: 0|1|2|3 }` with a load-time translator. UI replaces the strength toggle with three Lucide-iconed training tiles and a "+N ккал" footer.

A new component `EnergyBalanceRow` renders in two variants — `compact` (Dashboard) and `full` (Stats). Both read `profile.value`, `activity.value`, and the day's intake from `dailyLog`. Heatmap gets a second strip computed via the same `energyBalance` against historical `log_*` + `activity_*` records loaded on mount.

## Architecture

### Energy formulas (`src/lib/energy.ts`, new)

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
  delta: number; // intake − burn; negative = deficit
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

`scaling.ts`'s private `bmr` keeps working; refactoring it to import from `energy.ts` is out of scope.

### Activity schema migration (`src/state/activity.svelte.ts`)

```ts
export interface DayActivity {
  steps: number;
  trainings: 0 | 1 | 2 | 3;
}

const EMPTY: DayActivity = { steps: 0, trainings: 0 };

interface LegacyActivity {
  steps?: number;
  strength?: boolean;
  trainings?: 0 | 1 | 2 | 3;
}

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

// In load:
async load(this: void, date: string): Promise<void> {
  _date = date;
  const raw = await storage.load<LegacyActivity | null>(`activity_${date}`, null);
  _activity = migrate(raw);
},
```

Public surface:

- `setSteps(n)` (unchanged)
- `setTrainings(n: 0|1|2|3)` (new)
- `tickTraining(slot: 0|1|2)` (new — implements the auto-fill rule below)
- `toggleStrength` is **removed** along with the old field.

`tickTraining(slot)` rule: tapping slot N (1-indexed) sets `trainings = N` if currently `< N`, else `trainings = N − 1`. Maps the visual ramp.

### Activity UI (`src/routes/Activity.svelte`)

The strength toggle button is replaced with a card containing three tiles:

```svelte
<div class="border-border bg-surface-2 rounded-xl border p-5">
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
  <p class="text-muted mt-3 text-xs">
    +{activity.value.trainings * 120} ккал сьогодні
  </p>
</div>
```

(Heading copy: "Тренування" replaces the old strength-toggle copy. The `Check` icon import is dropped.)

### `EnergyBalanceRow` component (`src/components/EnergyBalanceRow.svelte`, new)

Two variants:

**Compact (Dashboard default):**

- Single row, full width, tinted bg by state, `min-h-12 rounded-lg px-3 py-2`.
- Left: state icon (`TrendingDown` / `Equal` / `TrendingUp`).
- Center: signed kcal delta, `text-2xl font-bold tabular-nums`. (Сurrency-style sign: `−345` or `+161`; for balanced state shows `±0` or just `0`.)
- Right: a horizontal mini-bar (`h-1.5 w-24 rounded-full bg-surface-2/60`) with an inner div whose width = `min(|delta| / 500, 1) × 100%`, anchored from the bar's center; deficit fills toward the left (negative direction), surplus toward the right.
- No long labels.

**Full (Stats):**

- Same row layout but adds a left-side text label (`Дефіцит` / `Баланс` / `Профіцит`) and a right-side breakdown (`{intake} / {burn} ккал`). Mini-bar still present, larger (`w-40`).

Shared color tokens:

| State      | bg             | border             | fg            |
| ---------- | -------------- | ------------------ | ------------- |
| `deficit`  | `bg-accent/10` | `border-accent/20` | `text-accent` |
| `balanced` | `bg-surface-2` | `border-border`    | `text-muted`  |
| `surplus`  | `bg-warn/10`   | `border-warn/30`   | `text-warn`   |

Component props:

```ts
interface Props {
  variant?: 'compact' | 'full';
}
```

Reads:

- `profile.value` (skip render if null)
- `activity.value` (skip render if profile present but `activity.date` mismatches `activeDate.value` — use `dailyTargets` style derived check)
- `dailyLog.entries` summed via `sumMacros(...)` for intake kcal
- Computes `actualBurn` + `energyBalance` reactively via `$derived`

### Dashboard mount (`src/routes/Dashboard.svelte`)

```svelte
<section class="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:grid-cols-4 md:gap-4 md:p-4">
  <div class="col-span-1 sm:col-span-2 md:col-span-4">
    <EnergyBalanceRow />
  </div>
  {#each CATEGORY_KEYS as key (key)}
    …
  {/each}
</section>
```

The pill spans the full row, then the category cards flow below.

### Stats mount (`src/routes/Stats.svelte`)

```svelte
<section class="flex flex-col gap-4 p-2 md:p-4">
  <EnergyBalanceRow variant="full" />
  <DailyTotals />
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <Heatmap />
    <CategoryBarChart />
  </div>
</section>
```

### Heatmap balance strip (`src/components/Heatmap.svelte`)

The component currently loads `log_*` keys and computes per-day quota verdict on mount. Extend the loader to also load `activity_*` for the same dates, compute `energyBalance` per day, and store it alongside the verdict.

```ts
type BalanceVerdict = 'none' | 'deficit' | 'balanced' | 'surplus';

let balanceByKey = $state<Record<string, BalanceVerdict>>({});

const BALANCE_COLOR: Record<BalanceVerdict, string> = {
  none: 'rgba(255,255,255,0.06)',
  deficit: 'var(--color-accent)',
  balanced: 'var(--color-muted)',
  surplus: 'var(--color-warn)',
};
```

Per-day computation uses `profile.value` (current snapshot — acceptable approximation; profile rarely changes). When `profile.value` is null the balance row renders nothing.

The strip is rendered as a single horizontal row of 90 cells aligned to the existing 7-row quota grid columns (CSS grid with the same `grid-flow-col` and matching column count). Placed below the quota grid, separated by `mt-3`.

Two-row legend at the bottom:

```
Quota:    □ У межах норм   □ 1–2 перевищення   □ 3+ перевищення
Енергобаланс: □ Дефіцит   □ Баланс   □ Профіцит
```

## Files touched

| File                                     | Action                                                         |
| ---------------------------------------- | -------------------------------------------------------------- |
| `src/lib/energy.ts`                      | create                                                         |
| `src/state/activity.svelte.ts`           | modify (schema migrate; rename methods)                        |
| `src/routes/Activity.svelte`             | modify (strength toggle → 3 tiles + footer)                    |
| `src/components/EnergyBalanceRow.svelte` | create (2 variants)                                            |
| `src/routes/Dashboard.svelte`            | modify (mount EnergyBalanceRow at top)                         |
| `src/routes/Stats.svelte`                | modify (mount EnergyBalanceRow full above DailyTotals)         |
| `src/components/Heatmap.svelte`          | modify (load activity, compute balance, render strip + legend) |

No data layer changes (storage shape is migrated transparently). No new deps. No new tests.

## Verification

**Computational sanity** — given profile 70/168/30/female/1.2:

- BMR = 1439
- 8000 steps, 1 training → step kcal 280, train kcal 120, burn = 1839.
- Intake 2000 → delta +161 → `surplus`.
- Intake 1750 → delta −89 → `balanced` (within ±100).
- Intake 1500 → delta −339 → `deficit`.

**Visual / UX**:

1. Dashboard pill visible above category cards. Tinted bg, signed delta, mini-bar fills proportionally and direction-anchored. State flips correctly across thresholds.
2. Stats `EnergyBalanceRow` full variant shows label + delta + breakdown.
3. Activity card: 3 tiles. Tapping slot 2 with state `0` fills 1 + 2; tapping slot 1 with state `2` drops to `1`; tapping slot 3 from `0` fills all three. `+N ккал` footer updates live. Footer hides at 0.
4. Heatmap: existing 7-row quota grid unchanged. New 1-row strip below shows per-day balance state. Two-section legend.
5. Mobile + desktop both render cleanly. Light + dark themes both readable.

**Migration**: 6. Load `activity_YYYY-MM-DD` with old `{ steps, strength: true }` shape → reads as `{ steps, trainings: 1 }`. Save → writes new shape only.

**Gates** — `pnpm run check`, `pnpm run lint`, `pnpm run build` all clean.

## Risks

- **Heatmap perf**: loads `log_*` AND `activity_*` for last 90 days now. ~180 reads on mount. Telegram CloudStorage has rate limits but this is one-time per Stats page open. Mitigation: parallelize (already does for log; replicate for activity).
- **Profile null at compact pill render**: guard with `if (!profile.value) return null` (Svelte: `{#if profile.value}`).
- **Negative-zero edge case**: `Math.round(-0.4) === 0`. State threshold uses `< -100` and `> 100`, so −0 maps to `balanced`. Fine.
- **`tickTraining` semantics**: the auto-fill rule means slot 2 can never be ticked alone. If a user wanted to express "I did session 2 but not 1" they can't. Acceptable for v1; this is a count-up mental model, not three independent flags.
- **Old `strength` field cleanup**: the migration translates on read but doesn't actively delete legacy fields from storage. Subsequent saves overwrite cleanly. Acceptable.

## Open follow-ups (not in scope)

- Goal-aware coloring (`profile.goal: 'lose' | 'maintain' | 'gain'` → flip semantic colors).
- "Per-day profile snapshot" so the heatmap reflects the user's actual weight on past dates rather than today's.
- A streak counter ("3 days in deficit") on the Stats page.

# Formulas

Every numeric formula and threshold the app uses, in one place. Each entry has a plain-language summary, the code form, the published source, and a pointer to the implementation.

The food catalog (per-item macros, max grams, units) lives separately in [`food-database.md`](./food-database.md). For research-validated formulas the app does not currently implement (IBW, caloric safety floors, MoH 1073/1613 caps, pediatric percentiles, GLP-1 considerations), see [`health-references.md`](./health-references.md).

---

## BMR — Basal Metabolic Rate

**Plain language.** Roughly how many calories the body burns at complete rest over 24 h — the floor of energy expenditure. The standard "you'd burn this much lying still all day" figure.

**Code.**

```ts
function bmr(p: ProfileInput): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}
```

**Math.** Mifflin-St Jeor:

```
BMR = 10·W + 6.25·H − 5·A + s
  W = weight (kg), H = height (cm), A = age (years)
  s = +5 for males, −161 for females
```

**Source.** Mifflin MD, St Jeor ST, et al. _A new predictive equation for resting energy expenditure in healthy individuals._ Am J Clin Nutr 1990; 51(2):241–7. Standard ACSM-recommended formula for adults.

**Used in.** `src/lib/energy.ts` (public), `src/lib/scaling.ts` (private, for TDEE).

---

## TDEE — Total Daily Energy Expenditure

**Plain language.** The user's expected average daily burn, taking their lifestyle activity level into account. The number of calories they'd consume per day to maintain weight on average.

**Code.**

```ts
function tdee(p: ProfileInput): number {
  return bmr(p) * p.activity;
}
```

**Math.**

```
TDEE = BMR × activity_factor

activity_factor:
  1.2     — sedentary (desk job, no exercise)
  1.375   — light activity (1–3 workouts / week)
  1.55    — moderate activity (3–5 workouts / week)
  1.725   — very active (6–7 workouts / week)
```

**Source.** Harris-Benedict / Katch-McArdle activity multipliers, widely accepted in nutrition apps. Values originated in Harris JA, Benedict FG (1919) and refined in Mifflin et al. (1990).

**Used in.** `src/lib/scaling.ts` (private, only used to derive macro targets and `k_factor`).

---

## k_factor — Per-User Food Database Scaling

**Plain language.** The ratio of the user's TDEE to a "baseline" TDEE (168 cm / 74 kg / 30 / female / sedentary). It scales the gram-based portion sizes in the food database so a heavier or more active user gets larger portions, while a lighter or less active user gets smaller. Piece-based items (eggs, bottles) are NOT scaled. Clamped to a sensible range so extreme profiles don't collapse or balloon the catalog.

**Code.**

```ts
const BASELINE: ProfileInput = {
  height: 168,
  weight: 74,
  gender: 'female',
  age: 30,
  activity: 1.2,
};
const K_MIN = 0.6;
const K_MAX = 1.6;

function computeKFactor(p: ProfileInput): number {
  const ratio = tdee(p) / tdee(BASELINE);
  const clamped = Math.max(K_MIN, Math.min(K_MAX, ratio));
  return Math.round(clamped * 100) / 100; // 2 decimals
}
```

**Math.**

```
k = clamp(TDEE_user / TDEE_baseline, 0.6, 1.6), rounded to 2 decimals
```

**Source.** Project-specific. The baseline profile and clamp range were chosen during initial design (`docs/superpowers/specs/2026-04-27-calorie-app-design.md`).

**Effect on food DB.** `scaleFoodDb(db, k)` walks every category and multiplies `max_g` by `k` for items whose `unit` is `'г'`. Piece-based items (`шт`) are left alone — eggs are 1 egg regardless of body size.

**Used in.** `src/lib/scaling.ts` (`computeKFactor`, `scaleFoodDb`); persisted on `UserProfile.k_factor` after each profile save.

---

## Daily Macro Targets

**Plain language.** Recommended daily intake of kilocalories, protein, carbohydrates, and fat. Drives the kcal target bar in DailyTotals and the per-macro progress bars.

**Code.**

```ts
function dailyTargets(p: ProfileInput): Macros {
  const tdeeVal = tdee(p);
  const proteinPerKg = p.activity >= 1.55 ? 1.6 : 1.2;
  return {
    kcal: Math.round(tdeeVal),
    protein: Math.round(p.weight * proteinPerKg),
    carbs: Math.round((tdeeVal * 0.5) / 4),
    fat: Math.round((tdeeVal * 0.3) / 9),
  };
}
```

**Math.**

```
kcal_target    = TDEE
protein_target = W × (1.6 if activity ≥ 1.55 else 1.2)   [g]
carbs_target   = (TDEE × 0.50) / 4                       [g, 4 kcal/g]
fat_target     = (TDEE × 0.30) / 9                       [g, 9 kcal/g]
```

(Implicit remainder, ~20 % of kcal, is the protein contribution; the macro split is not enforced as exact, just published as targets.)

**Source.**

- Protein 1.2–1.6 g/kg/day per Phillips SM (2014, _Sports Med_) and ACSM/IAAF nutrition position stands; the higher end applies to "active" lifestyles.
- 50 % carb / 30 % fat / ~20 % protein split is a standard balanced macronutrient distribution within the [AMDR](https://www.ncbi.nlm.nih.gov/books/NBK53374/) ranges (45–65 % carb, 20–35 % fat, 10–35 % protein).
- Atwater factors: 4 kcal/g for carbs and protein, 9 kcal/g for fat (Atwater WO, Bryant AP, 1900).

**Used in.** `src/lib/scaling.ts` (`dailyTargets`); rendered in `DailyTotals.svelte`, the targets card on `Profile.svelte`, and used by `Heatmap.svelte` for per-day comparisons.

---

## BMI — Body Mass Index

**Plain language.** A weight-for-height screening number. Useful as a quick adult risk classifier; not a diagnosis. The app shows it on the Stats page next to the energy-balance pill.

**Code.**

```ts
function bmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
```

**Math.**

```
BMI = weight_kg / (height_m)^2
```

**Classes** (WHO):

| BMI       | Class       |
| --------- | ----------- |
| < 18.5    | Underweight |
| 18.5–24.9 | Healthy     |
| 25.0–29.9 | Overweight  |
| ≥ 30.0    | Obese       |

**Source.** WHO BMI classification for adults aged 20+. The app does not implement pediatric percentiles or class subdivisions (Class 1/2/3 obesity); see `health-references.md` if those are added later.

**Used in.** `src/lib/health.ts`; rendered by `EnergyBalanceRow.svelte` (Stats `variant="full"` only).

---

## Hydration target & state

**Plain language.** Daily fluid intake target derived from body weight, with a gender-specific minimum so very small users still hit EFSA's absolute recommendation. The Activity tab tracks consumed millilitres against this target; the Stats heatmap colours each day green/red/blue based on whether you hit the band.

**Code.**

```ts
const ML_PER_KG = 30;
const FLOOR_MALE = 2500;
const FLOOR_FEMALE = 2000;

function hydrationTarget(p: ProfileInput): number {
  const floor = p.gender === 'male' ? FLOOR_MALE : FLOOR_FEMALE;
  return Math.max(Math.round(p.weight * ML_PER_KG), floor);
}

function hydrationState(consumedMl: number, targetMl: number): 'deficit' | 'balanced' | 'surplus' {
  const ratio = consumedMl / targetMl;
  if (ratio < 0.7) return 'deficit';
  if (ratio > 1.2) return 'surplus';
  return 'balanced';
}
```

**Math.**

```
target_ml = max(weight_kg × 30, gender_floor)
gender_floor = 2500 (male) | 2000 (female)

state = deficit  if consumed/target < 0.7
        surplus  if consumed/target > 1.2
        balanced otherwise

severe_deficit = consumed < 0.5 × target   (used by day-verdict strike)
```

**Source.** EFSA Dietary Reference Values (2010): 2.0 L (♀) / 2.5 L (♂) total water from beverages and food. The 30 ml/kg coefficient is the conservative low end of the EFSA-aligned 30–35 ml/kg range cited in national dietary guidelines (Estonia, Latvia); 35 is reserved for active climates and not modelled.

**Used in.** `src/lib/hydration.ts`; consumed by `Activity.svelte` (water tile), `EnergyBalanceRow.svelte` (water pill), and `Heatmap.svelte` (per-day strip + verdict strike).

---

## Step kcal

**Plain language.** Calories burned from walking, derived from a step count. Larger people burn more per step; the formula scales with body weight.

**Code.**

```ts
function stepKcal(steps: number, weightKg: number): number {
  return steps * weightKg * 0.0005;
}
```

**Math.**

```
step_kcal = steps × weight × 0.0005
```

For a 70 kg person, 1 000 steps ≈ 35 kcal; 10 000 steps ≈ 350 kcal. This matches MET-based research for walking at ~3 mph: `MET 3.3 × weight × hours` ≈ `3.3 × 70 × 1 h` = 231 kcal for ~6 000 steps → 38.5 kcal / 1 000 steps.

**Source.** Standard pedometer constant tuned to Ainsworth's _Compendium of Physical Activities_ (2011 update), MET 3.3 for walking 3 mph (4.8 km/h) on flat ground. Aligns with what Apple Health, Google Fit, and most pedometer apps display.

**Used in.** `src/lib/energy.ts`. Consumed by `actualBurn()`.

---

## Training kcal

**Plain language.** Each "light training" session the user logs adds a flat 120 kcal to the day's expenditure. Three slots × 120 kcal = 360 kcal max per day.

**Code.**

```ts
export const KCAL_PER_TRAINING = 120;

function trainingKcal(trainings: number): number {
  return trainings * KCAL_PER_TRAINING;
}
```

**Math.**

```
training_kcal = trainings × 120, where trainings ∈ {0, 1, 2, 3}
```

**Source.** Conservative midpoint for a 30-minute light resistance / mobility / yoga session at MET ~3.5 for a 70 kg person: `3.5 × 70 × 0.5 h ≈ 122 kcal`. Rounded to 120 to keep arithmetic friendly. Heavier or longer sessions are intentionally not modeled — the toggle is for "did I do something" not "how hard".

**Used in.** `src/lib/energy.ts`. Consumed by `actualBurn()`.

---

## Actual daily burn

**Plain language.** Today's real total energy expenditure, summing the basal floor with whatever movement the user actually logged. Different from TDEE — TDEE is a static lifestyle estimate; actualBurn reacts to what happened today.

**Code.**

```ts
function actualBurn(p: ProfileInput, a: DayActivity): number {
  return Math.round(bmr(p) + stepKcal(a.steps, p.weight) + trainingKcal(a.trainings));
}
```

**Math.**

```
actualBurn = BMR + step_kcal(steps, weight) + training_kcal(trainings)
```

**Used in.** `src/lib/energy.ts`. Consumed by `energyBalance()` and rendered as the "burn" half of the Stats summary row.

---

## Energy balance

**Plain language.** Today's calorie surplus or deficit. Negative = ate less than burned (deficit). Positive = ate more than burned (surplus). A small zone around zero is treated as "balanced" so a 50-kcal rounding wobble doesn't flip the state.

**Code.**

```ts
export const NEUTRAL_BAND_KCAL = 100;

function energyBalance(intakeKcal: number, burnKcal: number): EnergyBalance {
  const delta = Math.round(intakeKcal - burnKcal);
  let state: BalanceState;
  if (delta < -NEUTRAL_BAND_KCAL) state = 'deficit';
  else if (delta > NEUTRAL_BAND_KCAL) state = 'surplus';
  else state = 'balanced';
  return { burn: Math.round(burnKcal), intake: Math.round(intakeKcal), delta, state };
}
```

**Math.**

```
delta = intake_kcal − actualBurn
state = deficit  if delta < −100
        surplus  if delta > +100
        balanced otherwise
```

**Source.** Project-specific. The ±100 kcal band is well under 5 % of an average TDEE (~2 000 kcal), within ordinary measurement noise from food labeling and pedometer drift.

**Used in.** `src/lib/energy.ts`. Rendered by `EnergyBalanceRow.svelte` (Dashboard pill + Stats summary) and `Heatmap.svelte` (per-day strip).

---

## Per-entry macros

**Plain language.** Calories and macros from a single journal entry, given the food item and the percentage of its daily quota the user logged.

**Code.**

```ts
function entryMacros(entry: LogEntry, db: FoodDb): Macros {
  const cat = db[entry.cat];
  const item = cat.items[entry.id];
  if (!item) return ZERO_MACROS;
  const ref = item.macros ?? cat.macros;
  const amount = (item.max_g * entry.pct) / 100;
  const isPieces = (item.unit ?? 'г') !== 'г';
  const factor = isPieces ? amount : amount / 100;
  return {
    kcal: ref.kcal * factor,
    protein: ref.protein * factor,
    carbs: ref.carbs * factor,
    fat: ref.fat * factor,
  };
}
```

**Math.**

```
amount = max_g × pct / 100
factor = amount / 100        (gram-based items; macros stored per 100 g)
factor = amount              (piece-based items; macros stored per piece)
result = per_unit_macros × factor
```

`max_g` here is the user-scaled value from `personalizedDb()` (already multiplied by `k_factor` for gram items). So a single 50 % entry on a 200 g daily quota represents 100 g of food.

**Source.** Standard nutrition-label arithmetic; macros expressed per 100 g (or per piece for `шт` items) and scaled linearly by amount.

**Used in.** `src/lib/macros.ts`. Aggregated by `sumMacros()` for daily totals.

---

## Step target

**Plain language.** The "active lifestyle" daily step goal the progress bar in the Activity tab targets. Crossing it doesn't change anything in the energy-balance math (steps still scale linearly past the target); it's purely a visual goal.

**Code.**

```ts
export const STEP_TARGET = 7000;
```

**Source.** WHO public-health "active lifestyle" baseline. The widely-cited 10 000 figure is a marketing target from a 1965 Japanese pedometer (the Manpo-kei); recent meta-analyses (Paluch AE et al., 2022, _Lancet Public Health_) find mortality benefits plateau around 6 000–8 000 for older adults and 8 000–10 000 for younger adults. 7 000 is a reasonable midpoint.

**Used in.** `src/state/activity.svelte.ts` (export); `src/routes/Activity.svelte` (progress bar denominator).

---

## Per-day quota verdict (Heatmap)

**Plain language.** Each day in the heatmap is colored by the count of "strikes" — categories over their 100 % quota plus, if applicable, a single hydration strike for severe under-hydration (< 50 % of target). Green = no strikes; amber = 1–2; red = 3+.

**Code.**

```ts
function dayVerdict(entries: LogEntry[], hydrationDeficitSevere: boolean): DayVerdict {
  if (entries.length === 0 && !hydrationDeficitSevere) return 0;
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
  let overCount = Object.values(sums).filter((v) => v > 100).length;
  if (hydrationDeficitSevere) overCount += 1;
  if (overCount === 0) return 1;
  if (overCount <= 2) return 2;
  return 3;
}
```

**Math.**

```
strikes = #(category_pct > 100) + (1 if water < 0.5 × hydration_target else 0)
verdict = 0  if no entries and no severe hydration deficit
          1  if strikes == 0
          2  if strikes ∈ {1, 2}
          3  if strikes ≥ 3
```

**Source.** Project-specific. The hydration strike threshold (< 50 % of target) is intentionally tight — 60 % won't punish a normal day, but a 40 % day is a genuine bad-health signal.

**Used in.** `src/components/Heatmap.svelte` (function is local to the component, not exported).

---

## Per-day balance verdict (Heatmap strip)

**Plain language.** Each day in the lower heatmap strip is colored by the day's energy balance state, computed from food intake vs. profile + actual activity for that day.

**Code.**

```ts
// For each date with log entries:
const entries = await storage.load<LogEntry[]>(`log_${date}`, []);
const dayAct = await storage.load<DayActivity>(`activity_${date}`, { steps: 0, trainings: 0 });
const intake = sumMacros(entries, personalizedDb()).kcal;
const burn = actualBurn(profile.value, dayAct);
const verdict = energyBalance(intake, burn).state; // 'deficit' | 'balanced' | 'surplus'
```

**Caveat.** The retroactive computation uses _current_ `profile.value` for past days. If the user changed weight/age recently, historical days are slightly mis-calibrated. Acceptable approximation; honest profile snapshots per day are an open follow-up (see `docs/superpowers/specs/2026-04-28-energy-balance-design.md`).

**Used in.** `src/components/Heatmap.svelte` `onMount`.

---

## Animation gating thresholds

The animations on Dashboard / Stats fire only on **state transitions**, computed against the per-day `macroCrossings` store.

| Macro                 | State `under`       | State `hit`                         | State `over`               |
| --------------------- | ------------------- | ----------------------------------- | -------------------------- |
| kcal                  | `consumed < target` | `target ≤ consumed ≤ target × 1.05` | `consumed > target × 1.05` |
| protein / carbs / fat | `consumed < target` | `consumed ≥ target`                 | (n/a — no `over` state)    |

The 5 % dead band on kcal (`× 1.05`) prevents a 1-kcal overshoot from triggering a shake.

**Transitions that fire animations** (with their haptic):

| Transition                    | Macro     | Animation                        | Haptic                            |
| ----------------------------- | --------- | -------------------------------- | --------------------------------- |
| `under` → `hit`               | any       | `burstConfetti(barEl)`           | `notificationOccurred('success')` |
| `hit` → `over`                | kcal only | `shakeWarning(barEl)`            | `notificationOccurred('warning')` |
| `under` → `over`              | kcal only | `shakeWarning(barEl)`            | `notificationOccurred('warning')` |
| any → `under`                 | any       | nothing (silent reset)           | —                                 |
| First crossing of the day     | any       | additionally `flashEdge(<main>)` | `impactOccurred('medium')`        |
| Category > 100 % (transition) | any       | `pulseWarning(cardEl)`           | `notificationOccurred('warning')` |

**Used in.** `src/components/DailyTotals.svelte`, `src/components/CategoryCard.svelte`, `src/lib/anim.ts`.

---

## Summary of constants

| Constant                           | Value                              | Where                                |
| ---------------------------------- | ---------------------------------- | ------------------------------------ |
| `K_MIN`                            | 0.6                                | `src/lib/scaling.ts`                 |
| `K_MAX`                            | 1.6                                | `src/lib/scaling.ts`                 |
| Baseline profile                   | 168 cm / 74 kg / 30 / female / 1.2 | `src/lib/scaling.ts`                 |
| Step kcal constant                 | 0.0005                             | `src/lib/energy.ts`                  |
| `KCAL_PER_TRAINING`                | 120                                | `src/lib/energy.ts`                  |
| `NEUTRAL_BAND_KCAL`                | 100                                | `src/lib/energy.ts`                  |
| `STEP_TARGET`                      | 7 000                              | `src/state/activity.svelte.ts`       |
| Kcal "over" dead band              | × 1.05                             | `src/components/DailyTotals.svelte`  |
| Protein g/kg (active ≥ 1.55)       | 1.6                                | `src/lib/scaling.ts`                 |
| Protein g/kg (else)                | 1.2                                | `src/lib/scaling.ts`                 |
| Carb % of kcal                     | 50 %                               | `src/lib/scaling.ts`                 |
| Fat % of kcal                      | 30 %                               | `src/lib/scaling.ts`                 |
| Atwater factor — carb / protein    | 4 kcal/g                           | `src/lib/scaling.ts`                 |
| Atwater factor — fat               | 9 kcal/g                           | `src/lib/scaling.ts`                 |
| Crossings storage TTL              | 7 days                             | `src/state/macroCrossings.svelte.ts` |
| Hydration target factor            | 30 ml/kg                           | `src/lib/hydration.ts`               |
| Hydration floor (male)             | 2500 ml                            | `src/lib/hydration.ts`               |
| Hydration floor (female)           | 2000 ml                            | `src/lib/hydration.ts`               |
| Hydration deficit threshold        | 0.7 × target                       | `src/lib/hydration.ts`               |
| Hydration surplus threshold        | 1.2 × target                       | `src/lib/hydration.ts`               |
| Hydration severe-deficit threshold | 0.5 × target                       | `src/lib/hydration.ts`               |
| Hydration quick-add                | 250 ml                             | `src/lib/hydration.ts`               |
| BMI healthy lower bound            | 18.5                               | `src/lib/health.ts`                  |
| BMI overweight lower bound         | 25.0                               | `src/lib/health.ts`                  |
| BMI obese lower bound              | 30.0                               | `src/lib/health.ts`                  |

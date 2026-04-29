# Research integration: hydration, BMI, stats tips, doc references

**Date:** 2026-04-29
**Driver:** `reserch.md` (Scientific Validation of Anthropometric, Metabolic, and Nutritional Algorithms)
**Status:** spec

---

## Context

A research dossier audited the app's formulas against WHO / EFSA / CDC / Ukrainian MoH evidence. The core math (Mifflin-St Jeor BMR, PAL multipliers, Atwater 4-9-4, 1.2–1.6 g/kg protein, 50/30/~20 macro split) is already aligned with the literature. **No formula changes** to the existing code are required.

The research surfaces four tractable gaps that are worth closing now:

1. **Hydration is unmeasured.** EFSA mandates 2.0 L ♀ / 2.5 L ♂ as a baseline; a weight-based 30 ml/kg refinement matches the same target band.
2. **BMI is uncomputed**, despite being the WHO foundational screening metric and despite the app already holding all inputs.
3. **The Stats page exposes derived numbers without explaining them.** Users can't trace `1846 kcal` back to BMR × PAL.
4. **Documentation lags the research base.** Some research-validated formulas (IBW, safety floors, MoH 1073/1613 caps, pediatric percentiles) are out of scope for code today, but losing the citations would forfeit a solid future-proofing reference.

## Goals

- Add water tracking with a target derived from the user's profile, surfaced on Activity, Dashboard, Stats, and the Heatmap.
- Add BMI as a small derived stat on the Stats page.
- Add inline, collapsible tips next to each derived metric on the Stats page.
- Update `docs/formulas.md` and `docs/food-database.md` with research citations and the two new implemented formulas (BMI, hydration target).
- Create `docs/health-references.md` to capture research-validated formulas the app does not yet implement.

## Non-goals

- IBW computation in code (Devine / Robinson / Miller / Hamwi) — documented only.
- Caloric safety-floor enforcement (1200 ♀ / 1500 ♂) — no deficit-target feature exists, so the floor has no UI to gate.
- Trans-fat / sodium / sugar tracking — would require new fields across the food DB; explicitly out of scope.
- Pediatric percentile mode — the app is a single-adult tracker.
- Adding a 5th PAL tier (1.9 "extremely active") — YAGNI for a personal app.
- Exposing `actualBurn` in the hydration math — water has 0 kcal and stays orthogonal to energy balance.

## Decisions

### Hydration semantics

Hydration is a **separate axis** from energy balance, but it **does** participate in the daily heatmap verdict (severe under-hydration = 1 strike). It does not affect the energy-balance pill or `actualBurn()`.

### Hydration target

```
target_ml = max(weight_kg × 30, gender_floor)
gender_floor = 2500 ml (male) | 2000 ml (female)
```

The 30 ml/kg coefficient is the conservative low end of the EFSA-aligned 30–35 ml/kg band; 35 is reserved for active climates and is intentionally not modeled. The gender floor protects very small users (a 50 kg woman would otherwise target 1500 ml — below the EFSA absolute).

### Heatmap strip thresholds

Mirror the existing energy-balance strip's 3-state rendering.

| State    | Condition                  | Color              |
| -------- | -------------------------- | ------------------ |
| deficit  | `consumed < 70 % × target` | red / accent-warn  |
| balanced | `70 % ≤ consumed ≤ 120 %`  | green / accent-ok  |
| surplus  | `consumed > 120 %`         | blue / accent-info |

### Day-verdict integration

`dayVerdict()` gains one strike when hydration is severely deficient (`< 50 % × target`). The 50 % cutoff is intentionally tight — 60 % wouldn't punish a normal day, but a 40 % day genuinely is a bad health signal. Aggregation: hydration strike adds to the same `overCount` already used for category strikes, so a clean food day with severe dehydration becomes amber, not green.

### Water input UX

Activity card: **typed `number` input + `+250 ml` quick-add button**. Mirrors the Steps card structure (typed input + percent + bar) while making the dominant interaction (`hit the glass button`) one tap.

### BMI

Pure derived value, no state, no persistence. Rendered as a small pill at the start of `EnergyBalanceRow` on the Stats page (left of the existing balance pill, right of the new water pill — so the row reads `[BMI 23.4] [Δ −120] [💧 1.8 / 2.4 L]`). One collapsible tip explains the formula and the four WHO classes (underweight / healthy / overweight / obese; class subdivisions deferred). Pediatric path is explicitly out of scope. The BMI pill is variant-gated to `variant="full"` of `EnergyBalanceRow` so it appears only on Stats, not on the Dashboard's compact row.

### Stats tips

Native HTML `<details>` styled to look polished:

- Custom chevron via `summary::after` rotation.
- Smooth height animation via CSS `grid-template-rows: 0fr → 1fr` trick (no JS, no Melt).
- Subtle border + accent-tint on open.

Five tips, all in Ukrainian:

- **BMR** — _"Скільки калорій тіло спалює у спокої. Формула Mifflin-St Jeor."_ + formula.
- **TDEE** — _"BMR × множник активності — твоя добова норма для підтримки ваги."_ + formula.
- **Energy balance** — _"Спожито − спалено. Зелена зона ±100 ккал."_ + formula.
- **Hydration** — _"Ціль: 30 мл × вага, мінімум 2.0 / 2.5 л."_ + formula.
- **Day-verdict colors** — _"Зелений: усі категорії ≤ 100 %. Жовтий: 1–2 перебір. Червоний: 3+. Гідрація < 50 % додає страйк."_

### Documentation strategy

`docs/formulas.md` owns implemented constants. New file `docs/health-references.md` owns research-validated formulas the app does not currently implement.

## Architecture

### New / modified modules

| Path                                     | Status | Purpose                                                                            |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `src/lib/health.ts`                      | NEW    | `bmi(w, h)`, `bmiClass(b)`                                                         |
| `src/lib/hydration.ts`                   | NEW    | `hydrationTarget(p)`, `hydrationState(consumed, target)`                           |
| `src/components/StatTip.svelte`          | NEW    | reusable styled `<details>`                                                        |
| `src/state/activity.svelte.ts`           | MOD    | extend `DayActivity` with `waterMl`; `setWater`, `addWater` methods; migration     |
| `src/routes/Activity.svelte`             | MOD    | water tile (typed input + `+250` button + bar + percent)                           |
| `src/components/EnergyBalanceRow.svelte` | MOD    | water pill sibling to balance pill                                                 |
| `src/components/Heatmap.svelte`          | MOD    | hydration strip + extend local `dayVerdict()` signature with severe-deficit strike |
| `src/routes/Stats.svelte`                | MOD    | mount tips                                                                         |
| `docs/formulas.md`                       | MOD    | add BMI + Hydration sections + "See also" pointer                                  |
| `docs/food-database.md`                  | MOD    | MoH 1073/1613 callout + research citations on relevant catalog entries             |
| `docs/health-references.md`              | NEW    | IBW, safety floors, pediatric percentiles, MoH caps, GLP-1                         |

### Data flow — hydration

```
Activity.svelte           ┐
EnergyBalanceRow.svelte   ├─→ activity store (waterMl) ─→ storage (activity_YYYY-MM-DD)
                          │                          ┌─→ hydrationTarget(profile)
Heatmap.svelte            ┴─→ profile store ─────────┘   hydrationState(...)
                                                         dayVerdict(entries, severeDeficit)
```

### Storage migration

`activity.svelte.ts` `migrate()` is the single migration site. Add: if raw record has no `waterMl`, default to `0`. The existing pattern of `LegacyActivity` already handles forward-compat; just extend it.

No new storage key. The `crossings:YYYY-MM-DD` 7-day prune is unchanged. No bump to a versioned schema is needed because the legacy `migrate()` already implements the same shape-evolution pattern.

### Day-verdict signature change

`dayVerdict()` is currently a local function inside `Heatmap.svelte`; not exported. Stays local — only the signature evolves:

```ts
// before
function dayVerdict(entries: LogEntry[]): DayVerdict;

// after
function dayVerdict(entries: LogEntry[], hydrationDeficitSevere: boolean): DayVerdict;
```

The new arg is computed per day in the same `onMount` loop that already loads `entries` and `dayAct`: `severe = waterMl < 0.5 × hydrationTarget(profile)`. The `formulas.md` "Per-day quota verdict" section is updated to document the new strike source.

## Edge cases

- **Profile saved before water target exists** — `hydrationTarget(profile)` is pure, runs against current profile. No persistence dependency.
- **No water entered for the day** — `waterMl = 0`, hydration state = `deficit`, `dayVerdict` adds a strike. This means a day where the user logged food but no water becomes amber. Acceptable: matches the user-stated "C" verdict integration.
- **Day before water tracking existed** — historical `activity_YYYY-MM-DD` records load with `waterMl = 0` after migration; the heatmap will show a deficit strip and a strike for those days. Acceptable: the same retroactive-using-current-profile caveat already documented for energy balance applies.
- **Profile with no weight** — onboarding requires weight, so `hydrationTarget` is always callable when profile is loaded. Gate: only render the water pill / strip after `profile.value` is loaded.
- **Reduced-motion** — `<details>` height animation respects `prefers-reduced-motion: reduce` (instant snap, no transition).
- **Telegram CloudStorage** — `waterMl` is one extra integer; well within CloudStorage's 4 KB / key budget.

## Verification

- `command pnpm run check` — 0 errors, 0 warnings.
- `command pnpm run lint` — 0 errors, 0 warnings.
- `command pnpm run build` — succeeds.
- Manual viewport pass on iPhone 14 Pro Max / Galaxy S25 / iPhone SE: water tile fits with steps and trainings on Activity, water pill fits in `EnergyBalanceRow`, BMI tile fits on Stats, all `<details>` open/close smoothly, heatmap hydration strip lays out cleanly under the energy-balance strip.
- Manual data check: enter 0 / 250 / 1000 / 2400 / 4000 ml in dev — verify state classification (deficit / deficit / deficit / balanced / surplus for an 80 kg user; target = 2400).

## Risks

- **Heatmap density.** The heatmap already has a quota row + an energy-balance strip per day. Adding a hydration strip risks visual crowding. Mitigation: reuse the same compact strip height as the energy-balance row; user verifies on viewport pass.
- **Verdict semantics drift.** Adding a hydration strike to a "food category" verdict subtly merges two signals. Mitigation: documented explicitly in `formulas.md`; the legend in the day-verdict tip on Stats names hydration as a strike source.
- **`<details>` styling.** Cross-browser native disclosure styling is fiddly. Mitigation: hide the default marker (`details > summary { list-style: none; }` + WebKit reset), render a Lucide `ChevronDown` rotated via state attribute.

# Health references — research-validated, not implemented

This file holds formulas and thresholds that were validated by the v0.2.0 research audit (`reserch.md`) but are **not currently implemented in code**. They live here so the app can adopt them later without re-doing the literature work.

For currently-implemented formulas, see [`formulas.md`](./formulas.md).

---

## Ideal Body Weight (IBW)

**Plain language.** Linear equations that map height to a "target weight". Used clinically for hydrophilic-drug dosing and as a long-term weight target where lean mass matters more than total mass.

**Math (height in inches, baseline 60 inches = 152.4 cm).**

| Formula         | Male                      | Female                    |
| --------------- | ------------------------- | ------------------------- |
| Devine (1974)   | 50.0 + 2.30 × (h − 60) kg | 45.5 + 2.30 × (h − 60) kg |
| Robinson (1983) | 52.0 + 1.90 × (h − 60) kg | 49.0 + 1.70 × (h − 60) kg |
| Miller (1983)   | 56.2 + 1.41 × (h − 60) kg | 53.1 + 1.36 × (h − 60) kg |
| Hamwi (1964)    | 48.0 + 2.70 × (h − 60) kg | 45.4 + 2.20 × (h − 60) kg |

**Caveats.**

- All four assume height ≥ 60 inches; below that, multipliers go negative (mathematically invalid).
- Devine underestimates athletic and tall populations; Miller is generally the most permissive.
- A practical adoption is to average the four and apply ±10 % for frame-size variance.

**Status in the app.** Not implemented. Would slot into `src/lib/health.ts` next to `bmi()` if added.

---

## Caloric safety floors (self-directed weight loss)

**Plain language.** Hard lower limits on daily kcal targets for non-medically-supervised weight loss. Below these the diet stops being safe at home.

```
Adult male:   ≥ 1500 kcal/day
Adult female: ≥ 1200 kcal/day
```

**Source.** WHO / NIH consumer weight-management guidelines.

**Status in the app.** Not implemented. The app surfaces TDEE (maintenance) rather than a deficit target, so there is no current UI to gate. If a deficit-target feature is added, the floor must be enforced as a hard cap on the allowed deficit calculation.

---

## Pediatric BMI percentiles (CDC, ages 2–19)

**Plain language.** Children's BMI cannot use adult absolute thresholds; rapid growth and pubertal variation make absolute values meaningless. Percentile-based classification against age + sex peer cohorts is required.

```
< 5th percentile      → Underweight
5th to < 85th         → Healthy weight
85th to < 95th        → Overweight
≥ 95th                → Obesity
≥ 120 % of 95th       → Severe obesity (Class 2)  — or BMI ≥ 35
≥ 140 % of 95th       → Extreme severe obesity (Class 3) — or BMI ≥ 40
```

The WHO 5–19 reference uses standard-deviation z-scores rather than pure percentiles; > +1 SD = overweight, > +2 SD = obesity, < −2 SD = thinness.

**Status in the app.** Not implemented. Calorie is a single-adult tracker. Adding pediatric mode would require age-cohort lookup tables (LMS values from CDC or WHO) and a runtime switch on the user's age before the 20th birthday.

---

## MoH 1073 / 1613 — sodium, sugar, trans-fat caps

**Plain language.** Ukrainian Ministry of Health codified WHO-aligned dietary limits in Order 1073 (2017) and Order 1613 (2020).

```
Free sugars       < 10 % of total energy (preferably < 5 %)
Saturated fat     < 10 % of total energy
Trans fat         < 1 % of total energy
                  ≤ 2 g per 100 g total fat (retail products, MoH 1613)
Sodium target     ~2000 mg/day  (≈ 5 g salt/day)
Dietary fibre     ≥ 25 g/day
```

**Status in the app.** Not implemented. The food DB schema (`src/data/foodDb.json`) does not currently carry sodium, sugar, or fat-subtype fields per item. Adding them would propagate through `Macros`, `sumMacros`, `entryMacros`, and a new tracking surface. Out of scope for v0.2.0.

---

## GLP-1 receptor agonist considerations

**Plain language.** Users on semaglutide / tirzepatide experience profound chemically induced satiety and slowed gastric emptying. Highest risk: dropping below the 1200/1500 kcal safety floor without noticing, plus rapid sarcopenia from low protein intake during weight loss.

**Recommendations (per WHO 2025 guidelines).**

- Pair pharmacotherapy with intensive behavioural therapy, nutritional tracking, and structured activity — never use in isolation.
- Prioritise high-protein, nutrient-dense meals; aim for the upper end of 1.2–1.6 g/kg protein.
- Resistance training is critical to preserve lean mass during fast weight loss.

**Status in the app.** Not implemented. A future "GLP-1 mode" profile flag could push the app to surface high-protein category suggestions and tighten the kcal floor enforcement.

---

## 5th PAL tier (extremely active)

The research recognises a 5th activity multiplier — **1.9** — for daily endurance athletes or physically demanding vocations (masonry, agriculture). The app currently caps at 1.725 ("very active"). Not adopted: a personal app's user is unlikely to need it, and the difference is < 10 % of daily kcal.

---

## Owen / WHO–FAO–UNU formulas

These older BMR equations were considered and rejected — Owen achieved only ~59 % accuracy in validation studies; WHO/FAO/UNU lacks individual-error validation. Mifflin-St Jeor remains the implemented default. See `formulas.md` for the chosen formula.

# Food Database

The seed catalog the app personalizes per user. 8 categories (А–З), 39 items total. Lives in `src/data/foodDb.json` and is wrapped at runtime by `personalizedDb()` (in `src/state/personalizedDb.ts`), which applies the user's `k_factor` to gram-based portion sizes.

> **Regulatory limits — Ukraine MoH Orders 1073 (2017) and 1613 (2020).** Order 1073 codified Ukrainian physiological norms aligned with WHO/EFSA: free sugars < 10 % of energy (preferably < 5 %), saturated fat < 10 %, fibre ≥ 25 g/day, sodium target 2 g/day. Order 1613 caps industrial trans-fatty acids at ≤ 2 g per 100 g total fat in retail products, in line with the WHO REPLACE initiative. The app does **not** currently track sodium, sugar, or trans-fat per food item — these are documented in [`health-references.md`](./health-references.md) as out-of-scope future fields. Present limits inform portion-size calibration only.

For the formulas referenced below — BMR, TDEE, k_factor, daily macro targets — see [`formulas.md`](./formulas.md).

---

## How the catalog is personalized — `k_factor` scaling

The `max_g` column in the tables below is the **baseline** quota for a 168 cm / 74 kg / 30-year-old / sedentary female (k = 1.0). Each user gets a personalized version where that quota is multiplied by their `k_factor`.

```
k_user      = clamp(TDEE_user / TDEE_baseline, 0.6, 1.6)
max_g_user  = round(max_g_baseline × k_user)   for items with unit "г"
max_g_user  = max_g_baseline                   for items with unit "шт" (pieces)
```

So a heavier or more-active user sees larger portion sizes on rice, vegetables, dairy, etc. — but the egg quota stays at 6 eggs and bottle counts don't shift. Pieces don't scale with body size.

The scaling is one-shot at profile save: when you save profile changes, `k_factor` is recomputed and stored on `UserProfile`. The catalog is then re-derived on every read via `personalizedDb()` so all three places that consume it (Dashboard category cards, Journal lookups, EntrySheet sliders) stay in sync.

Pieces vs grams is decided by the `unit` field. Anything not equal to `'г'` is treated as a piece-based item.

---

## Macros are per 100 g (or per piece)

The `kcal / protein / carbs / fat` values in the tables below are nutrition-label style — per 100 g for gram-based items, and per single piece for piece-based items (eggs are per-egg, not per 100 g). When the app computes the macros for a journal entry, it scales linearly with the amount actually consumed.

```
amount = max_g × pct / 100
factor = amount / 100      (gram items)
factor = amount            (piece items)
result = per_unit_macros × factor
```

A few items intentionally have no per-item macros and inherit the category's `macros` block (e.g., the umbrella "Овочі та гриби" entry). The runtime falls back to category macros when an item omits its own.

---

## Categories

### А — Бобові, картопля, крупи

| ID  | Item                  | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | --------------------- | ------------- | ---- | ---- | ------- | ----- | --- |
| a1  | Бобові                | 80            | г    | 340  | 22      | 60    | 1.5 |
| a2  | Картопля              | 325           | г    | 77   | 2       | 17    | 0.1 |
| a3  | Кукурудза свіжа       | 290           | г    | 86   | 3.3     | 19    | 1.4 |
| a4  | Рис (нешліфований)    | 75            | г    | 370  | 8       | 76    | 2.7 |
| a5  | Будь-яка крупа        | 75            | г    | 350  | 11      | 70    | 3   |
| a6  | Цільнозернове борошно | 75            | г    | 340  | 13      | 70    | 2   |
| a7  | Хлібці                | 75            | г    | 380  | 11      | 65    | 2   |
| a8  | Цільнозерновий хліб   | 100           | г    | 250  | 9       | 45    | 3   |
| a9  | Макарони т.с.         | 70            | г    | 360  | 12      | 75    | 1   |
| a10 | Лаваш                 | 100           | г    | 280  | 9       | 55    | 1   |

> **Notes on А-category staples.** Whole-grain rye and unrefined-grain alternatives (a4, a8) carry arabinoxylans and beta-glucans that lower postprandial glycaemic response and serum LDL. Pseudocereal **buckwheat** (covered by a5 "Будь-яка крупа") is naturally gluten-free and rich in rutin. See [`health-references.md`](./health-references.md) for the underlying clinical citations.

### Б — М'ясо, риба, яйця

| ID  | Item                   | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | ---------------------- | ------------- | ---- | ---- | ------- | ----- | --- |
| b1  | Телятина               | 250           | г    | 130  | 22      | 0     | 4   |
| b2  | Печінка                | 330           | г    | 135  | 19      | 5     | 4   |
| b3  | Куряче або індиче філе | 390           | г    | 110  | 23      | 0     | 1   |
| b4  | Риба (до 5% жиру)      | 390           | г    | 110  | 22      | 0     | 3   |
| b5  | Риба (від 5% жиру)     | 250           | г    | 200  | 22      | 0     | 12  |
| b6  | Яйця                   | 6             | шт   | 70   | 6       | 0.4   | 5   |
| b7  | Морепродукти           | 430           | г    | 90   | 18      | 1     | 1   |

`b6` (eggs) is the canonical piece-based item — the `max_g` value here is "6 eggs", not "6 grams".

> **Notes on Б-category fats.** Pieces-based items (e.g. eggs, b6) intentionally do not k-scale; they are physiologically discrete. Cured pork fat ("сало") would belong in Г-category if added — its fatty-acid profile carries fat-soluble vitamins A and D but is calorie-dense (~700–800 kcal / 100 g) and warrants tight portion control.

### В — Овочі та гриби

| ID  | Item                                 | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | ------------------------------------ | ------------- | ---- | ---- | ------- | ----- | --- |
| c1  | Овочі (вкл. зелень/квашені) та гриби | 600           | г    | 25   | 2       | 4     | 0.3 |

A single umbrella row covering vegetables, greens, fermented vegetables, and mushrooms.

> **Notes on В-category umbrella.** Traditional Ukrainian borscht — water-dense (~80.5 % moisture), low calorie (~30–65 kcal / 100 g), high fibre (1.5–3 g) — fits squarely under c1 plus contributions from the chosen meat/dairy categories. Beetroot betalains and dietary nitrates contribute documented antioxidant and vasodilatory effects.

### Г — Жири та соуси

| ID  | Item              | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | ----------------- | ------------- | ---- | ---- | ------- | ----- | --- |
| d1  | Олія (рек. лляну) | 17            | г    | 884  | 0       | 0     | 100 |
| d2  | Майонез           | 25            | г    | 680  | 1       | 3     | 75  |
| d3  | Авокадо           | 100           | г    | 160  | 2       | 9     | 15  |
| d4  | Оливки            | 140           | г    | 115  | 1       | 6     | 11  |
| d5  | Гірчиця           | 120           | г    | 60   | 4       | 6     | 3   |
| d6  | Кетчуп            | 80            | г    | 100  | 1       | 25    | 0.5 |

### Д — Молочні продукти

| ID  | Item                              | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | --------------------------------- | ------------- | ---- | ---- | ------- | ----- | --- |
| e1  | Сир кисломолочний нежирний (0,2%) | 280           | г    | 70   | 18      | 1.3   | 0.2 |
| e2  | Сири м'які, тверді, плавлені      | 60            | г    | 350  | 25      | 2     | 28  |
| e3  | Сметана 15%                       | 150           | г    | 160  | 3       | 4     | 15  |
| e4  | Кефір 1%                          | 510           | г    | 40   | 3       | 4     | 1   |
| e5  | Несолодкий йогурт 1%              | 510           | г    | 45   | 4       | 5     | 1   |
| e6  | Молоко 1%                         | 510           | г    | 42   | 3       | 5     | 1   |

### Е — Фрукти та ягоди

| ID  | Item                    | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | ----------------------- | ------------- | ---- | ---- | ------- | ----- | --- |
| f1  | Фрукти та ягоди         | 440           | г    | 50   | 1       | 12    | 0.3 |
| f2  | Банани, виноград, хурма | 230           | г    | 90   | 1.1     | 22    | 0.3 |

`f2` is split out because high-sugar fruits get a smaller daily quota than the average-fruit umbrella.

### Ж — Горіхи та насіння

| ID  | Item                        | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | --------------------------- | ------------- | ---- | ---- | ------- | ----- | --- |
| g1  | Будь-які горіхи або насіння | 10            | г    | 600  | 20      | 15    | 55  |

10 g (≈ a small handful) is intentionally tight — nuts are calorie-dense and act as a fat-source modifier rather than a meal component.

### З — Будь-що (смаколики, алкоголь)

| ID  | Item                                     | max_g (k=1.0) | unit | kcal | protein | carbs | fat |
| --- | ---------------------------------------- | ------------- | ---- | ---- | ------- | ----- | --- |
| h1  | Будь-що (солодощі, снеки, ковбаса тощо)  | 90            | г    | 480  | 5       | 55    | 22  |
| h2  | Фрукти                                   | 900           | г    | 50   | 1       | 12    | 0.3 |
| h3  | Банани                                   | 475           | г    | 90   | 1.1     | 22    | 0.3 |
| h4  | Міцні алкогольні напої (НЕ КОЖНОГО ДНЯ!) | 50            | г    | 220  | 0       | 0     | 0   |
| h5  | Пиво (НЕ КОЖНОГО ДНЯ!)                   | 240           | г    | 43   | 0.5     | 3.5   | 0   |
| h6  | Сухе вино (НЕ КОЖНОГО ДНЯ!)              | 150           | г    | 70   | 0.1     | 0.6   | 0   |

The "wildcard" category. `h1` covers any treat / processed food; `h2`–`h3` are extra fruit headroom for users who want more than category Е allows; `h4`–`h6` are alcohol with prominent "not every day" warnings in the labels.

---

## Adding or editing items

Edit `src/data/foodDb.json` directly. The JSON is type-checked against `FoodDb` in `src/types/food.ts` (`pnpm run check` will catch shape mismatches).

When adding an item:

- `max_g` is the **baseline** quota for the reference profile (168 / 74 / 30 / female / 1.2). Pick a value such that 100 % of `max_g` is a sensible per-day portion for that profile; a typical user with a different `k_factor` will see this multiplied or divided.
- `unit` defaults to `'г'`. Use `'шт'` for piece-based items so they don't get gram-scaled by `k_factor`.
- `macros` is per 100 g (or per piece for `шт` items). If omitted, the category's `macros` block is used as a fallback — useful for umbrella items where a per-item value would be misleading.
- `name` should be Ukrainian (the app's locale). Use the Cyrillic character set; spell-check is not enforced.
- IDs are lowercased category letter + sequence: `a11`, `b8`, `h7`. Keep them stable — journal entries reference items by ID, so renaming an existing ID would orphan past entries.

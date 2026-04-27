import type { FoodDb, Macros } from '$types/food';
import type { LogEntry } from '$types/log';

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/**
 * Macros for a single log entry.
 * - For gram-based items: amount_g = max_g * pct/100, factor = amount/100,
 *   macros = perItemMacros * factor.
 * - For piece-based items (unit !== 'г'): amount = pieces, factor = amount,
 *   macros = perPieceMacros * factor.
 */
export function entryMacros(entry: LogEntry, db: FoodDb): Macros {
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

export function sumMacros(entries: LogEntry[], db: FoodDb): Macros {
  const total: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const entry of entries) {
    const m = entryMacros(entry, db);
    total.kcal += m.kcal;
    total.protein += m.protein;
    total.carbs += m.carbs;
    total.fat += m.fat;
  }
  return total;
}

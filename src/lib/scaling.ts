import type { FoodDb, Macros } from '$types/food';
import type { ProfileInput } from '$types/profile';
import { bmr } from '$lib/energy';

const BASELINE: ProfileInput = {
  height: 168,
  weight: 74,
  gender: 'female',
  age: 30,
  activity: 1.2,
};

const K_MIN = 0.6;
const K_MAX = 1.6;

function tdee(p: ProfileInput): number {
  return bmr(p) * p.activity;
}

export function computeKFactor(p: ProfileInput): number {
  const ratio = tdee(p) / tdee(BASELINE);
  const clamped = Math.max(K_MIN, Math.min(K_MAX, ratio));
  return Math.round(clamped * 100) / 100;
}

/**
 * Recommended daily macro targets for a profile.
 * - kcal: TDEE (maintenance) via BMR (Mifflin or Katch–McArdle when
 *   body-fat is computable from waist/neck/hip) × activity factor.
 * - protein: 1.6 g/kg for active profiles (activity ≥ 1.55), 1.2 g/kg otherwise.
 * - carbs: 50% of kcal at 4 kcal/g.
 * - fat: 30% of kcal at 9 kcal/g.
 */
export function dailyTargets(p: ProfileInput): Macros {
  const tdeeVal = tdee(p);
  const proteinPerKg = p.activity >= 1.55 ? 1.6 : 1.2;
  return {
    kcal: Math.round(tdeeVal),
    protein: Math.round(p.weight * proteinPerKg),
    carbs: Math.round((tdeeVal * 0.5) / 4),
    fat: Math.round((tdeeVal * 0.3) / 9),
  };
}

export function scaleFoodDb(db: FoodDb, k: number): FoodDb {
  if (k === 1.0) return db;
  const out = structuredClone(db);
  for (const cat of Object.values(out)) {
    for (const item of Object.values(cat.items)) {
      // Pieces (e.g. eggs) are not scaled by body size.
      if ((item.unit ?? 'г') === 'г') {
        item.max_g = Math.round(item.max_g * k);
      }
    }
  }
  return out;
}

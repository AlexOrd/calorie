import type { FoodDb } from '$types/food';
import type { ProfileInput } from '$types/profile';

const BASELINE: ProfileInput = {
  height: 168,
  weight: 74,
  gender: 'female',
  age: 30,
  activity: 1.2,
};

const K_MIN = 0.6;
const K_MAX = 1.6;

function bmr(p: ProfileInput): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}

function tdee(p: ProfileInput): number {
  return bmr(p) * p.activity;
}

export function computeKFactor(p: ProfileInput): number {
  const ratio = tdee(p) / tdee(BASELINE);
  const clamped = Math.max(K_MIN, Math.min(K_MAX, ratio));
  return Math.round(clamped * 100) / 100;
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

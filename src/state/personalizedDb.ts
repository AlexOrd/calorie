import baseFoodDb from '../data/foodDb.json';
import { profile } from './profile.svelte';
import { scaleFoodDb } from '$lib/scaling';
import type { FoodDb } from '$types/food';

const BASE: FoodDb = baseFoodDb;

/**
 * Returns the foodDb scaled by the current user's k-factor.
 * Reactive because it reads `profile.value` (a $state rune) — calling this
 * inside a `$derived` or template re-runs whenever the profile changes.
 */
export function personalizedDb(): FoodDb {
  const k = profile.value?.k_factor ?? 1.0;
  return scaleFoodDb(BASE, k);
}

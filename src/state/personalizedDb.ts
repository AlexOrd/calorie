import baseFoodDb from '../data/foodDb.json';
import { profile } from './profile.svelte';
import { scaleFoodDb } from '$lib/scaling';
import type { FoodDb } from '$types/food';

const BASE = baseFoodDb as FoodDb;

const _personalizedDb = $derived.by<FoodDb>(() => {
  const k = profile.value?.k_factor ?? 1.0;
  return scaleFoodDb(BASE, k);
});

// Svelte 5 disallows exporting $derived directly. Per the compiler's hint,
// expose the value via a function — calling it inside templates / $derived
// keeps reactivity intact.
export function personalizedDb(): FoodDb {
  return _personalizedDb;
}

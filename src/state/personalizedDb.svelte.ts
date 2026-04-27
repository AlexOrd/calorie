import baseFoodDb from '../data/foodDb.json';
import { profile } from './profile.svelte';
import { scaleFoodDb } from '$lib/scaling';
import type { FoodDb } from '$types/food';

const BASE = baseFoodDb as FoodDb;

const _personalizedDb = $derived.by<FoodDb>(() => {
  const k = profile.value?.k_factor ?? 1.0;
  return scaleFoodDb(BASE, k);
});

// Svelte 5 disallows exporting $derived directly; wrap in a getter so consumers
// read `.value` and stay reactive.
export const personalizedDb = {
  get value(): FoodDb {
    return _personalizedDb;
  },
};

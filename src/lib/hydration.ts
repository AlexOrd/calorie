import type { ProfileInput } from '$types/profile';

export type HydrationState = 'deficit' | 'balanced' | 'surplus';

const ML_PER_KG = 30;
const FLOOR_MALE = 2500;
const FLOOR_FEMALE = 2000;

export function hydrationTarget(p: ProfileInput): number {
  const floor = p.gender === 'male' ? FLOOR_MALE : FLOOR_FEMALE;
  const weighted = Math.round(p.weight * ML_PER_KG);
  return Math.max(weighted, floor);
}

export function hydrationState(consumedMl: number, targetMl: number): HydrationState {
  if (targetMl <= 0) return 'balanced';
  const ratio = consumedMl / targetMl;
  if (ratio < 0.7) return 'deficit';
  if (ratio > 1.2) return 'surplus';
  return 'balanced';
}

export function isHydrationSevereDeficit(consumedMl: number, targetMl: number): boolean {
  if (targetMl <= 0) return false;
  return consumedMl < 0.5 * targetMl;
}

export const HYDRATION_QUICK_ADD_ML = 250;

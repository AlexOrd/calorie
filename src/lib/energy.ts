import type { ProfileInput } from '$types/profile';
import type { DayActivity } from '$state/activity.svelte';

export const KCAL_PER_TRAINING = 120;
export const NEUTRAL_BAND_KCAL = 100;

// Mifflin-St Jeor.
export function bmr(p: ProfileInput): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}

// Pedometer formula tuned to MET-based walking research:
// at 70 kg ≈ 35 kcal per 1000 steps.
export function stepKcal(steps: number, weightKg: number): number {
  return steps * weightKg * 0.0005;
}

export function trainingKcal(trainings: number): number {
  return trainings * KCAL_PER_TRAINING;
}

export function actualBurn(p: ProfileInput, a: DayActivity): number {
  return Math.round(bmr(p) + stepKcal(a.steps, p.weight)); // trainings added in Task 2
}

export type BalanceState = 'deficit' | 'balanced' | 'surplus';

export interface EnergyBalance {
  burn: number;
  intake: number;
  delta: number;
  state: BalanceState;
}

export function energyBalance(intakeKcal: number, burnKcal: number): EnergyBalance {
  const delta = Math.round(intakeKcal - burnKcal);
  let state: BalanceState;
  if (delta < -NEUTRAL_BAND_KCAL) state = 'deficit';
  else if (delta > NEUTRAL_BAND_KCAL) state = 'surplus';
  else state = 'balanced';
  return { burn: Math.round(burnKcal), intake: Math.round(intakeKcal), delta, state };
}

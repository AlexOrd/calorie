import type { ProfileInput } from '$types/profile';
import type { DayActivity } from '$types/activity';
import { bodyFatPct } from '$lib/bodyfat';

export const KCAL_PER_TRAINING = 120;
export const NEUTRAL_BAND_KCAL = 100;

// Mifflin-St Jeor.
export function bmrMifflin(p: ProfileInput): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}

// Katch–McArdle. Uses lean body mass; more accurate when body composition
// is known. Formula: 370 + 21.6 × LBM, where LBM = weight × (1 − bf/100).
export function bmrKatch(weightKg: number, bfPct: number): number {
  const lbm = weightKg * (1 - bfPct / 100);
  return 370 + 21.6 * lbm;
}

// Returns the body-fat % derivable from a profile, or null when waist/neck
// (and hip for females) are missing or yield non-finite results.
function profileBodyFat(p: ProfileInput): number | null {
  if (p.waist_cm === undefined || p.neck_cm === undefined) return null;
  if (p.gender === 'female') {
    if (p.hip_cm === undefined) return null;
    return bodyFatPct({
      gender: p.gender,
      heightCm: p.height,
      waistCm: p.waist_cm,
      neckCm: p.neck_cm,
      hipCm: p.hip_cm,
    });
  }
  return bodyFatPct({
    gender: p.gender,
    heightCm: p.height,
    waistCm: p.waist_cm,
    neckCm: p.neck_cm,
  });
}

// Resolves the active BMR formula for a profile: Katch when body-fat is
// derivable from circumferences, otherwise Mifflin.
export function bmrFormula(p: ProfileInput): 'mifflin' | 'katch' {
  return profileBodyFat(p) === null ? 'mifflin' : 'katch';
}

export function bmr(p: ProfileInput): number {
  const bf = profileBodyFat(p);
  if (bf !== null) return bmrKatch(p.weight, bf);
  return bmrMifflin(p);
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
  return Math.round(bmr(p) + stepKcal(a.steps, p.weight) + trainingKcal(a.trainings));
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

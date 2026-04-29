import type { Gender } from '$types/profile';

export interface BodyFatInputs {
  gender: Gender;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number;
}

/**
 * US Navy body-fat % formula. Returns null when any required input is missing
 * or yields a non-finite result. Female form requires hipCm; male form ignores it.
 */
export function bodyFatPct(input: BodyFatInputs): number | null {
  const { gender, heightCm, waistCm, neckCm, hipCm } = input;
  if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return null;
  if (gender === 'female' && (hipCm === undefined || hipCm <= 0)) return null;

  const log10 = (x: number): number => Math.log10(x);
  let bf: number;
  if (gender === 'male') {
    if (waistCm <= neckCm) return null;
    bf = 86.01 * log10(waistCm - neckCm) - 70.041 * log10(heightCm) + 36.76;
  } else {
    const hip = hipCm ?? 0;
    if (waistCm + hip <= neckCm) return null;
    bf = 163.205 * log10(waistCm + hip - neckCm) - 97.684 * log10(heightCm) - 78.387;
  }
  if (!Number.isFinite(bf) || bf < 0 || bf > 60) return null;
  return Math.round(bf * 10) / 10;
}

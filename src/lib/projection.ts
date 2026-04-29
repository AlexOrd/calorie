import { addDays } from '$lib/date';

export interface ProjectionResult {
  etaIso: string;
  daysAway: number;
  avgDailyDeltaKcal: number;
  sampleDays: number;
}

/**
 * Project goal-date ETA from current weight + target + 7-day average daily
 * energy delta (intake − burn). Returns null when missing inputs, wrong-direction
 * trajectory, or no recent log data.
 *
 * Uses the standard 7700 kcal ≈ 1 kg-of-fat approximation.
 */
export function projectGoalDate(args: {
  todayIso: string;
  currentWeightKg: number;
  targetWeightKg: number;
  recentDailyDeltas: number[]; // intake - burn for the last 7 days where data existed
}): ProjectionResult | null {
  const { todayIso, currentWeightKg, targetWeightKg, recentDailyDeltas } = args;
  const sampleDays = recentDailyDeltas.length;
  if (sampleDays === 0) return null;
  if (currentWeightKg <= 0 || targetWeightKg <= 0) return null;
  if (currentWeightKg === targetWeightKg) return null;

  const avg = recentDailyDeltas.reduce((sum, d) => sum + d, 0) / sampleDays;
  const deltaKg = currentWeightKg - targetWeightKg; // positive: need to lose
  const wantsLoss = deltaKg > 0;
  const inDeficit = avg < 0;
  if (wantsLoss !== inDeficit) return null; // wrong trajectory

  const dailyKgChange = -avg / 7700; // negative avg → positive loss-per-day
  if (dailyKgChange === 0) return null;
  const daysToTarget = Math.abs(deltaKg / dailyKgChange);
  if (!Number.isFinite(daysToTarget)) return null;
  const daysAway = Math.round(daysToTarget);
  if (daysAway <= 0 || daysAway > 365 * 5) return null;

  const etaIso = addDays(todayIso, daysAway);
  return {
    etaIso,
    daysAway,
    avgDailyDeltaKcal: Math.round(avg),
    sampleDays,
  };
}

import { addDays } from '$lib/date';

export interface ProjectionResult {
  etaIso: string;
  daysAway: number;
  avgDailyDeltaKcal: number;
  sampleDays: number;
  trendKgPerDay: number;
}

interface WeightSample {
  iso: string;
  kg: number;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  const ms = to - from;
  return Math.round(ms / 86_400_000);
}

function observedWeightTrendKgPerDay(samples: readonly WeightSample[]): number | null {
  if (samples.length < 3) return null;
  const sorted = [...samples].sort((a, b) => a.iso.localeCompare(b.iso));
  const startIso = sorted[0]?.iso;
  if (!startIso) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  const n = sorted.length;
  for (const p of sorted) {
    if (!Number.isFinite(p.kg)) return null;
    const x = daysBetween(startIso, p.iso);
    const y = p.kg;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  return Number.isFinite(slope) ? slope : null;
}

export function estimateDailyWeightTrend(args: {
  recentDailyDeltas: number[];
  recentWeights?: readonly WeightSample[];
}): number | null {
  const sampleDays = args.recentDailyDeltas.length;
  if (sampleDays === 0) return null;
  const avg = args.recentDailyDeltas.reduce((sum, d) => sum + d, 0) / sampleDays;
  if (!Number.isFinite(avg)) return null;
  const kcalTrend = -avg / 7700; // kg/day; negative means losing
  if (!Number.isFinite(kcalTrend)) return null;

  const observedTrend = args.recentWeights ? observedWeightTrendKgPerDay(args.recentWeights) : null;
  if (observedTrend === null) return kcalTrend;

  // Blend observed scale trend with calorie model to reduce day-to-day noise.
  const blended = observedTrend * 0.6 + kcalTrend * 0.4;
  return Number.isFinite(blended) ? blended : kcalTrend;
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
  recentWeights?: readonly WeightSample[];
}): ProjectionResult | null {
  const { todayIso, currentWeightKg, targetWeightKg, recentDailyDeltas, recentWeights } = args;
  const sampleDays = recentDailyDeltas.length;
  if (sampleDays === 0) return null;
  if (currentWeightKg <= 0 || targetWeightKg <= 0) return null;
  if (currentWeightKg === targetWeightKg) return null;

  const avg = recentDailyDeltas.reduce((sum, d) => sum + d, 0) / sampleDays;
  if (!Number.isFinite(avg)) return null;
  const trendKgPerDay = estimateDailyWeightTrend({
    recentDailyDeltas,
    ...(recentWeights !== undefined ? { recentWeights } : {}),
  });
  if (trendKgPerDay === null || trendKgPerDay === 0) return null;

  const deltaKg = currentWeightKg - targetWeightKg; // positive: need to lose
  const wantsLoss = deltaKg > 0;
  const isLosing = trendKgPerDay < 0;
  if (wantsLoss !== isLosing) return null; // wrong trajectory

  const kgRemaining = targetWeightKg - currentWeightKg;
  const daysToTarget = kgRemaining / trendKgPerDay;
  if (!Number.isFinite(daysToTarget)) return null;
  const daysAway = Math.round(daysToTarget);
  if (daysAway <= 0 || daysAway > 365 * 5) return null;

  const etaIso = addDays(todayIso, daysAway);
  return {
    etaIso,
    daysAway,
    avgDailyDeltaKcal: Math.round(avg),
    sampleDays,
    trendKgPerDay,
  };
}

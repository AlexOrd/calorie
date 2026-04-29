import { storage } from '$lib/storage';
import { addDays, isLogKey, todayKey } from '$lib/date';
import { sumMacros } from '$lib/macros';
import { actualBurn, NEUTRAL_BAND_KCAL } from '$lib/energy';
import { hydrationTarget, isHydrationSevereDeficit } from '$lib/hydration';
import { personalizedDb } from '$state/personalizedDb';
import type { LogEntry } from '$types/log';
import type { DayActivity } from '$state/activity.svelte';
import type { UserProfile } from '$types/profile';
import type { CategoryKey } from '$types/food';

export interface StreakStat {
  current: number;
  best: number;
}

export interface StreakStats {
  deficit: StreakStat;
  water: StreakStat;
  category: StreakStat;
}

const MAX_DAYS = 365;

interface DayState {
  hasLog: boolean;
  inDeficit: boolean;
  hitWater: boolean;
  cleanCategories: boolean;
}

async function loadDayState(date: string, profile: UserProfile, target: number): Promise<DayState> {
  const entries = await storage.load<LogEntry[]>(`log_${date}`, []);
  const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
    steps: 0,
    trainings: 0,
    waterMl: 0,
  });

  const hasLog = entries.length > 0;
  let inDeficit = false;
  if (hasLog) {
    const intake = sumMacros(entries, personalizedDb()).kcal;
    const burn = actualBurn(profile, dayAct);
    inDeficit = intake - burn < -NEUTRAL_BAND_KCAL;
  }

  const hitWater = target > 0 && dayAct.waterMl >= target;

  const sums: Record<CategoryKey, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
  for (const e of entries) sums[e.cat] += e.pct;
  const overCount = Object.values(sums).filter((v) => v > 100).length;
  const severeDehydration = target > 0 && isHydrationSevereDeficit(dayAct.waterMl, target);
  const cleanCategories = hasLog && overCount === 0 && !severeDehydration;

  return { hasLog, inDeficit, hitWater, cleanCategories };
}

export async function computeStreaks(profile: UserProfile): Promise<StreakStats> {
  const target = hydrationTarget(profile);
  const allKeys = await storage.keys();
  const logSet = new Set(allKeys.filter(isLogKey).map((k) => k.slice(4)));
  const earliest = logSet.size === 0 ? null : [...logSet].sort()[0];

  const result: StreakStats = {
    deficit: { current: 0, best: 0 },
    water: { current: 0, best: 0 },
    category: { current: 0, best: 0 },
  };

  let runDeficit = 0;
  let runWater = 0;
  let runCategory = 0;
  let bestDeficit = 0;
  let bestWater = 0;
  let bestCategory = 0;

  const today = todayKey();
  let stillCurrentDeficit = true;
  let stillCurrentWater = true;
  let stillCurrentCategory = true;

  for (let i = 0; i < MAX_DAYS; i++) {
    const date = addDays(today, -i);
    if (earliest && date < earliest) break;

    const state = await loadDayState(date, profile, target);

    if (state.inDeficit) {
      runDeficit += 1;
      bestDeficit = Math.max(bestDeficit, runDeficit);
    } else {
      if (stillCurrentDeficit) {
        result.deficit.current = runDeficit;
        stillCurrentDeficit = false;
      }
      runDeficit = 0;
    }

    if (state.hitWater) {
      runWater += 1;
      bestWater = Math.max(bestWater, runWater);
    } else {
      if (stillCurrentWater) {
        result.water.current = runWater;
        stillCurrentWater = false;
      }
      runWater = 0;
    }

    if (state.cleanCategories) {
      runCategory += 1;
      bestCategory = Math.max(bestCategory, runCategory);
    } else {
      if (stillCurrentCategory) {
        result.category.current = runCategory;
        stillCurrentCategory = false;
      }
      runCategory = 0;
    }
  }

  if (stillCurrentDeficit) result.deficit.current = runDeficit;
  if (stillCurrentWater) result.water.current = runWater;
  if (stillCurrentCategory) result.category.current = runCategory;
  result.deficit.best = bestDeficit;
  result.water.best = bestWater;
  result.category.best = bestCategory;

  return result;
}

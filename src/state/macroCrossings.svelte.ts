import { storage } from '$lib/storage';
import { todayKey, addDays } from '$lib/date';
import type { DayCrossings, Macro, MacroState } from '$types/crossings';

// Telegram CloudStorage rejects keys with characters outside [A-Za-z0-9_-],
// so the per-day prefix uses '_' rather than ':'.
const KEY_PREFIX = 'crossings_';

function emptyDay(): DayCrossings {
  return {
    kcal: 'under',
    protein: 'under',
    carbs: 'under',
    fat: 'under',
    categories: {},
  };
}

const _byDate = $state<Record<string, DayCrossings>>({});

export const macroCrossings = {
  async load(this: void, date: string): Promise<void> {
    const stored = await storage.load<DayCrossings | null>(KEY_PREFIX + date, null);
    _byDate[date] = stored ?? emptyDay();
  },

  isLoaded(this: void, date: string): boolean {
    return date in _byDate;
  },

  macroState(this: void, date: string, macro: Macro): MacroState {
    return _byDate[date]?.[macro] ?? 'under';
  },

  categoryState(this: void, date: string, key: string): 'under' | 'over' {
    return _byDate[date]?.categories[key] ?? 'under';
  },

  async setMacro(this: void, date: string, macro: Macro, next: MacroState): Promise<void> {
    const day = _byDate[date] ?? emptyDay();
    day[macro] = next;
    _byDate[date] = day;
    await storage.save(KEY_PREFIX + date, day);
  },

  async setCategory(this: void, date: string, key: string, next: 'under' | 'over'): Promise<void> {
    const day = _byDate[date] ?? emptyDay();
    day.categories[key] = next;
    _byDate[date] = day;
    await storage.save(KEY_PREFIX + date, day);
  },

  hasAnyCrossing(this: void, date: string): boolean {
    const day = _byDate[date];
    if (!day) return false;
    if (
      day.kcal !== 'under' ||
      day.protein !== 'under' ||
      day.carbs !== 'under' ||
      day.fat !== 'under'
    ) {
      return true;
    }
    return Object.values(day.categories).some((s) => s === 'over');
  },

  async pruneOlderThan(this: void, daysOld: number): Promise<void> {
    const cutoff = addDays(todayKey(), -daysOld);
    const keys = await storage.keys();
    for (const k of keys) {
      if (!k.startsWith(KEY_PREFIX)) continue;
      const date = k.slice(KEY_PREFIX.length);
      if (date < cutoff) await storage.remove(k);
    }
  },
};

import { storage } from '$lib/storage';
import { debounce } from '$lib/debounce';

export interface DayActivity {
  steps: number;
  trainings: 0 | 1 | 2 | 3;
  waterMl: number;
}

interface LegacyActivity {
  steps?: number;
  strength?: boolean;
  trainings?: 0 | 1 | 2 | 3;
  waterMl?: number;
}

const EMPTY: DayActivity = { steps: 0, trainings: 0, waterMl: 0 };

function migrate(raw: LegacyActivity | null): DayActivity {
  if (!raw) return { ...EMPTY };
  const steps = Math.max(0, Math.round(raw.steps ?? 0));
  const waterMl = Math.max(0, Math.round(raw.waterMl ?? 0));
  if (typeof raw.trainings === 'number') {
    const t = Math.max(0, Math.min(3, raw.trainings));
    if (t === 0) return { steps, trainings: 0, waterMl };
    if (t === 1) return { steps, trainings: 1, waterMl };
    if (t === 2) return { steps, trainings: 2, waterMl };
    return { steps, trainings: 3, waterMl };
  }
  if (raw.strength === true) return { steps, trainings: 1, waterMl };
  return { steps, trainings: 0, waterMl };
}

let _activity = $state<DayActivity>({ ...EMPTY });
let _date = $state<string>('');
let _loadedFor = $state<string>('');

// Persist captures (date, value) at queue time so a date switch between
// queue and fire can't write the previous day's data into the new day's key.
const persist = debounce((date: string, value: DayActivity) => {
  void storage.save(`activity_${date}`, value);
}, 500);

export const activity = {
  get value(): DayActivity {
    return _activity;
  },
  get date(): string {
    return _date;
  },
  // True iff `_activity` reflects storage for the currently active date.
  // App.svelte gates UI on this so writes can't race with a pending load.
  get isReady(): boolean {
    return _loadedFor !== '' && _loadedFor === _date;
  },

  async load(this: void, date: string): Promise<void> {
    _date = date;
    const raw = await storage.load<LegacyActivity | null>(`activity_${date}`, null);
    if (_date !== date) return;
    _activity = migrate(raw);
    _loadedFor = date;
  },

  setSteps(this: void, steps: number): void {
    _activity = { ..._activity, steps: Math.max(0, Math.round(steps)) };
    persist(_date, _activity);
  },

  setTrainings(this: void, trainings: 0 | 1 | 2 | 3): void {
    _activity = { ..._activity, trainings };
    persist(_date, _activity);
  },

  tickTraining(this: void, slot: 0 | 1 | 2): void {
    const current = _activity.trainings;
    let next: 0 | 1 | 2 | 3;
    switch (slot) {
      case 0:
        next = current >= 1 ? 0 : 1;
        break;
      case 1:
        next = current >= 2 ? 1 : 2;
        break;
      case 2:
        next = current >= 3 ? 2 : 3;
        break;
    }
    _activity = { ..._activity, trainings: next };
    persist(_date, _activity);
  },

  setWater(this: void, ml: number): void {
    _activity = { ..._activity, waterMl: Math.max(0, Math.round(ml)) };
    persist(_date, _activity);
  },

  addWater(this: void, deltaMl: number): void {
    const next = Math.max(0, Math.round(_activity.waterMl + deltaMl));
    _activity = { ..._activity, waterMl: next };
    persist(_date, _activity);
  },
};

/** Step count target — Public-health "active lifestyle" baseline. */
export const STEP_TARGET = 7000;

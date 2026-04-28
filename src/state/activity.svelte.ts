import { storage } from '$lib/storage';
import { debounce } from '$lib/debounce';

export interface DayActivity {
  steps: number;
  trainings: 0 | 1 | 2 | 3;
}

interface LegacyActivity {
  steps?: number;
  strength?: boolean;
  trainings?: 0 | 1 | 2 | 3;
}

const EMPTY: DayActivity = { steps: 0, trainings: 0 };

function migrate(raw: LegacyActivity | null): DayActivity {
  if (!raw) return { ...EMPTY };
  const steps = Math.max(0, Math.round(raw.steps ?? 0));
  if (typeof raw.trainings === 'number') {
    const t = Math.max(0, Math.min(3, raw.trainings));
    if (t === 0) return { steps, trainings: 0 };
    if (t === 1) return { steps, trainings: 1 };
    if (t === 2) return { steps, trainings: 2 };
    return { steps, trainings: 3 };
  }
  if (raw.strength === true) return { steps, trainings: 1 };
  return { steps, trainings: 0 };
}

let _activity = $state<DayActivity>({ ...EMPTY });
let _date = $state<string>('');

const persist = debounce(() => {
  void storage.save(`activity_${_date}`, _activity);
}, 500);

export const activity = {
  get value(): DayActivity {
    return _activity;
  },
  get date(): string {
    return _date;
  },

  async load(this: void, date: string): Promise<void> {
    _date = date;
    const raw = await storage.load<LegacyActivity | null>(`activity_${date}`, null);
    _activity = migrate(raw);
  },

  setSteps(this: void, steps: number): void {
    _activity = { ..._activity, steps: Math.max(0, Math.round(steps)) };
    persist();
  },

  setTrainings(this: void, trainings: 0 | 1 | 2 | 3): void {
    _activity = { ..._activity, trainings };
    persist();
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
    persist();
  },
};

/** Step count target — Public-health "active lifestyle" baseline. */
export const STEP_TARGET = 7000;

import { storage } from '$lib/storage';
import { debounce } from '$lib/debounce';

export interface DayActivity {
  steps: number;
  strength: boolean;
}

const EMPTY: DayActivity = { steps: 0, strength: false };

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
    _activity = await storage.load<DayActivity>(`activity_${date}`, { ...EMPTY });
  },

  setSteps(this: void, steps: number): void {
    _activity = { ..._activity, steps: Math.max(0, Math.round(steps)) };
    persist();
  },

  toggleStrength(this: void): void {
    _activity = { ..._activity, strength: !_activity.strength };
    persist();
  },
};

/** Step count target — Public-health "active lifestyle" baseline. */
export const STEP_TARGET = 7000;

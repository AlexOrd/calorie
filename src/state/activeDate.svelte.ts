import { todayKey } from '$lib/date';

let _date = $state<string>(todayKey());

export const activeDate = {
  get value(): string {
    return _date;
  },
  // `this: void` — safe to detach as a reference.
  set(this: void, date: string): void {
    _date = date;
  },
};

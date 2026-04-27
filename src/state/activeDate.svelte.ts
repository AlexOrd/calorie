import { todayKey } from '$lib/date';

let _date = $state<string>(todayKey());

export const activeDate = {
  get value(): string {
    return _date;
  },
  set(date: string): void {
    _date = date;
  },
};

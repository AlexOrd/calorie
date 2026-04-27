import { storage } from '$lib/storage';
import { debounce } from '$lib/debounce';
import type { CategoryKey } from '$types/food';
import { CATEGORY_KEYS } from '$types/food';
import type { LogEntry } from '$types/log';

const QUOTA_BYTES = 3800;

let _entries = $state<LogEntry[]>([]);
let _date = $state<string>('');
let _quotaWarning = $state(false);

const persist = debounce(() => {
  void storage.save(`log_${_date}`, _entries);
}, 500);

function checkQuota(): void {
  _quotaWarning = JSON.stringify(_entries).length > QUOTA_BYTES;
}

export const dailyLog = {
  get entries(): LogEntry[] {
    return _entries;
  },
  get date(): string {
    return _date;
  },
  get quotaWarning(): boolean {
    return _quotaWarning;
  },

  async load(date: string): Promise<void> {
    _date = date;
    _entries = await storage.load<LogEntry[]>(`log_${date}`, []);
    checkQuota();
  },

  add(entry: Omit<LogEntry, 'ts'>): void {
    _entries = [..._entries, { ...entry, ts: Date.now() }];
    checkQuota();
    persist();
  },

  remove(ts: number): void {
    _entries = _entries.filter((e) => e.ts !== ts);
    checkQuota();
    persist();
  },
};

const _categoryConsumed = $derived.by<Record<CategoryKey, number>>(() => {
  const sums: Record<CategoryKey, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
    G: 0,
    H: 0,
  };
  for (const e of dailyLog.entries) sums[e.cat] += e.pct;
  return sums;
});

// Svelte 5 disallows exporting $derived directly; wrap in a getter so consumers
// read `.value` and stay reactive.
export const categoryConsumed = {
  get value(): Record<CategoryKey, number> {
    return _categoryConsumed;
  },
};

export { CATEGORY_KEYS };

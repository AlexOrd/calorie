import { storage } from '$lib/storage';
import { debounce } from '$lib/debounce';
import type { CategoryKey } from '$types/food';
import { CATEGORY_KEYS } from '$types/food';
import type { LogEntry } from '$types/log';

const QUOTA_BYTES = 3800;

let _entries = $state<LogEntry[]>([]);
let _date = $state<string>('');
let _loadedFor = $state<string>('');
let _quotaWarning = $state(false);

// Persist captures (date, entries) at queue time so a date switch between
// queue and fire can't write the previous day's data into the new day's key.
const persist = debounce((date: string, entries: LogEntry[]) => {
  void storage.save(`log_${date}`, entries);
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
  // True iff `_entries` reflects storage for the currently active date.
  // Consumers (App.svelte) gate user interaction on this so writes can't
  // race with a pending async load and get overwritten on resolution.
  get isReady(): boolean {
    return _loadedFor !== '' && _loadedFor === _date;
  },

  // `this: void` — these methods don't use `this`; they read/write
  // module-level closures. Marking them lets consumers pass them as
  // references (e.g. `onDelete={dailyLog.remove}`) without ESLint's
  // unbound-method warning.
  async load(this: void, date: string): Promise<void> {
    _date = date;
    const data = await storage.load<LogEntry[]>(`log_${date}`, []);
    // If the active date changed during the await (rapid date switch),
    // a later load call has authority — discard this stale result.
    if (_date !== date) return;
    _entries = data;
    _loadedFor = date;
    checkQuota();
  },

  add(this: void, entry: Omit<LogEntry, 'ts'>): void {
    _entries = [..._entries, { ...entry, ts: Date.now() }];
    checkQuota();
    persist(_date, _entries);
  },

  remove(this: void, ts: number): void {
    _entries = _entries.filter((e) => e.ts !== ts);
    checkQuota();
    persist(_date, _entries);
  },

  /**
   * Replace all entries for a given item with a single new entry at `pct`.
   * Used by the entry sheet's prefilled-then-edited flow so the journal stays
   * consistent with what the user sees in the slider.
   */
  setItem(this: void, id: string, cat: CategoryKey, pct: number): void {
    const filtered = _entries.filter((e) => !(e.id === id && e.cat === cat));
    _entries = [...filtered, { id, cat, pct, ts: Date.now() }];
    checkQuota();
    persist(_date, _entries);
  },
};

/**
 * Sum of % already logged for a specific item on the current day.
 * Reactive — reads dailyLog.entries inside.
 */
export function itemTotal(id: string, cat: CategoryKey): number {
  let sum = 0;
  for (const e of dailyLog.entries) {
    if (e.id === id && e.cat === cat) sum += e.pct;
  }
  return sum;
}

/** Number of distinct items logged today. */
export function itemCount(): number {
  // Plain map (not Set) to avoid svelte/prefer-svelte-reactivity in
  // .svelte.ts modules — this Set would be discarded immediately.
  const seen: Record<string, true> = {};
  for (const e of dailyLog.entries) seen[`${e.cat}/${e.id}`] = true;
  return Object.keys(seen).length;
}

/**
 * Returns the per-category sum of consumed % for the current day.
 * Reactive because it reads `dailyLog.entries` (a $state-backed getter) —
 * calling this inside a `$derived` or template re-runs on each entry add/remove.
 */
export function categoryConsumed(): Record<CategoryKey, number> {
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
}

export { CATEGORY_KEYS };

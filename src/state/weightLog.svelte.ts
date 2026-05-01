import { storage } from '$lib/storage';
import { addDays, todayKey } from '$lib/date';

const KEY = 'weight_log';
// Telegram CloudStorage caps a key at ~4 KB. ~20 bytes/entry → keep ~180 days
// max. We render 90 days; pruning at 180 leaves a safe headroom for backfill.
const KEEP_DAYS = 180;

let _log = $state<Record<string, number>>({});
let _loaded = $state(false);

function prune(log: Record<string, number>): Record<string, number> {
  const cutoff = addDays(todayKey(), -KEEP_DAYS);
  const out: Record<string, number> = {};
  for (const [iso, kg] of Object.entries(log)) {
    if (iso >= cutoff) out[iso] = kg;
  }
  return out;
}

export const weightLog = {
  get value(): Record<string, number> {
    return _log;
  },
  get isLoaded(): boolean {
    return _loaded;
  },
  get today(): number | null {
    return _log[todayKey()] ?? null;
  },

  async load(this: void): Promise<void> {
    _log = await storage.load<Record<string, number>>(KEY, {});
    _loaded = true;
  },

  async setForDate(this: void, dateIso: string, kg: number): Promise<void> {
    const safe = Math.max(20, Math.min(400, Math.round(kg * 10) / 10));
    _log = prune({ ..._log, [dateIso]: safe });
    await storage.save(KEY, _log);
  },

  async setToday(this: void, kg: number): Promise<void> {
    await weightLog.setForDate(todayKey(), kg);
  },
};

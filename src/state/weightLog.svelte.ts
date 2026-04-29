import { storage } from '$lib/storage';
import { todayKey } from '$lib/date';

const KEY = 'weight_log';

let _log = $state<Record<string, number>>({});
let _loaded = $state(false);

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
    const raw = await storage.load<Record<string, number>>(KEY, {});
    _log = raw && typeof raw === 'object' ? raw : {};
    _loaded = true;
  },

  async setForDate(this: void, dateIso: string, kg: number): Promise<void> {
    const safe = Math.max(20, Math.min(400, Math.round(kg * 10) / 10));
    _log = { ..._log, [dateIso]: safe };
    await storage.save(KEY, _log);
  },

  async setToday(this: void, kg: number): Promise<void> {
    await weightLog.setForDate(todayKey(), kg);
  },
};

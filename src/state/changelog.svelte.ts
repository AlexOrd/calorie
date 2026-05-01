import { storage } from '$lib/storage';
import { repairChangelogVersion } from '$lib/storage/repair';
import { APP_VERSION } from '../data/changelog';
import { cmpVersion } from '$lib/version';

const KEY = 'last_shown_changelog_version';

let _lastShown = $state<string | null>(null);
let _loaded = $state(false);

export const changelogState = {
  get lastShownVersion(): string | null {
    return _lastShown;
  },
  get isLoaded(): boolean {
    return _loaded;
  },
  get hasUnseenChanges(): boolean {
    if (!_loaded) return false;
    if (_lastShown === null) return false; // first-launch is silent
    return cmpVersion(_lastShown, APP_VERSION) < 0;
  },

  async load(this: void): Promise<void> {
    const raw = await storage.load<unknown>(KEY, null);
    const { value, changed } = repairChangelogVersion(raw);
    _lastShown = value;
    _loaded = true;
    if (changed) {
      if (value === null) await storage.remove(KEY);
      else await storage.save(KEY, value);
    }
  },

  async markSeen(this: void): Promise<void> {
    _lastShown = APP_VERSION;
    await storage.save(KEY, APP_VERSION);
  },

  async seedFirstLaunch(this: void): Promise<void> {
    _lastShown = APP_VERSION;
    await storage.save(KEY, APP_VERSION);
  },
};

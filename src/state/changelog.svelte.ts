import { storage } from '$lib/storage';
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
    _lastShown = await storage.load<string | null>(KEY, null);
    _loaded = true;
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

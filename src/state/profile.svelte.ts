import { storage } from '$lib/storage';
import { nowIso } from '$lib/date';
import { computeKFactor } from '$lib/scaling';
import type { ProfileInput, UserProfile } from '$types/profile';

const KEY = 'user_profile';

let _profile = $state<UserProfile | null>(null);
let _loaded = $state(false);

export const profile = {
  get value(): UserProfile | null {
    return _profile;
  },
  get loaded(): boolean {
    return _loaded;
  },
  get hasProfile(): boolean {
    return _profile !== null;
  },

  async load(this: void): Promise<void> {
    _profile = await storage.load<UserProfile | null>(KEY, null);
    _loaded = true;
  },

  async save(this: void, input: ProfileInput): Promise<void> {
    const k_factor = computeKFactor(input);
    const next: UserProfile = {
      ...input,
      k_factor,
      last_updated: nowIso(),
      biometric_lock: _profile?.biometric_lock ?? false,
    };
    _profile = next;
    await storage.save(KEY, next);
  },

  async setBiometricLock(this: void, enabled: boolean): Promise<void> {
    if (!_profile) return;
    const next: UserProfile = { ..._profile, biometric_lock: enabled };
    _profile = next;
    await storage.save(KEY, next);
  },

  async clear(this: void): Promise<void> {
    _profile = null;
    await storage.remove(KEY);
  },
};

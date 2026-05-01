import { storage } from '$lib/storage';
import { repairProfile } from '$lib/storage/repair';
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
    const raw = await storage.load<unknown>(KEY, null);
    const { value, changed } = repairProfile(raw);
    _profile = value;
    _loaded = true;
    // If repair dropped the profile (out-of-bounds fields, wrong shape),
    // remove the unusable record so the user falls into onboarding cleanly.
    if (changed) {
      if (value === null) await storage.remove(KEY);
      else await storage.save(KEY, value);
    }
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

import type { HapticImpactStyle, HapticNotificationType } from '$types/telegram';

const HAPTIC_MIN_VERSION = '6.1';

function supportsHaptics(): boolean {
  if (typeof window === 'undefined') return false;
  const tg = window.Telegram?.WebApp;
  if (!tg?.HapticFeedback) return false;
  if (typeof tg.isVersionAtLeast === 'function') return tg.isVersionAtLeast(HAPTIC_MIN_VERSION);
  return false;
}

function feedback() {
  if (!supportsHaptics()) return null;
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.HapticFeedback ?? null;
}

export function hapticImpact(style: HapticImpactStyle = 'light'): void {
  try {
    feedback()?.impactOccurred(style);
  } catch {
    // Older Telegram clients can throw WebAppMethodUnsupported.
  }
}

export function hapticNotify(type: HapticNotificationType): void {
  try {
    feedback()?.notificationOccurred(type);
  } catch {
    // Older Telegram clients can throw WebAppMethodUnsupported.
  }
}

export function hapticSelection(): void {
  try {
    feedback()?.selectionChanged();
  } catch {
    // Older Telegram clients can throw WebAppMethodUnsupported.
  }
}

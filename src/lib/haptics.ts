import type { HapticImpactStyle, HapticNotificationType } from '$types/telegram';

function feedback() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.HapticFeedback ?? null;
}

export function hapticImpact(style: HapticImpactStyle = 'light'): void {
  feedback()?.impactOccurred(style);
}

export function hapticNotify(type: HapticNotificationType): void {
  feedback()?.notificationOccurred(type);
}

export function hapticSelection(): void {
  feedback()?.selectionChanged();
}

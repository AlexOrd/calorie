import type { TelegramWebAppUser } from '$types/telegram';

export function getTelegramUser(): TelegramWebAppUser | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

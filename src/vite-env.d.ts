/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { TelegramWebApp } from '$types/telegram';

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

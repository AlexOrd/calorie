/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
  interface TelegramCloudStorage {
    setItem(key: string, value: string, callback?: (err: Error | null, ok: boolean) => void): void;
    getItem(key: string, callback: (err: Error | null, value: string | null) => void): void;
    removeItem(key: string, callback?: (err: Error | null, ok: boolean) => void): void;
    getKeys(callback: (err: Error | null, keys: string[]) => void): void;
  }

  interface TelegramThemeParams {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  }

  interface TelegramWebApp {
    initData: string;
    ready(): void;
    expand(): void;
    themeParams: TelegramThemeParams;
    CloudStorage: TelegramCloudStorage;
  }

  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export {};

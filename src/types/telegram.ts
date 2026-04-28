export interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (err: Error | null, ok: boolean) => void): void;
  getItem(key: string, callback: (err: Error | null, value: string | null) => void): void;
  removeItem(key: string, callback?: (err: Error | null, ok: boolean) => void): void;
  getKeys(callback: (err: Error | null, keys: string[]) => void): void;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitDataUnsafe {
  user?: TelegramWebAppUser;
  query_id?: string;
  auth_date?: number;
  hash?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  ready(): void;
  expand(): void;
  themeParams: TelegramThemeParams;
  colorScheme: 'light' | 'dark';
  CloudStorage: TelegramCloudStorage;
  disableVerticalSwipes?(): void;
  onEvent?(name: string, callback: () => void): void;
}

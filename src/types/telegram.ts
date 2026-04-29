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

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotificationType = 'error' | 'success' | 'warning';

export interface TelegramHapticFeedback {
  impactOccurred(style: HapticImpactStyle): TelegramHapticFeedback;
  notificationOccurred(type: HapticNotificationType): TelegramHapticFeedback;
  selectionChanged(): TelegramHapticFeedback;
}

export interface TelegramBiometricManager {
  isInited: boolean;
  isBiometricAvailable: boolean;
  isAccessGranted: boolean;
  isBiometricTokenSaved: boolean;
  init(callback?: () => void): TelegramBiometricManager;
  requestAccess(
    params: { reason?: string },
    callback?: (granted: boolean) => void,
  ): TelegramBiometricManager;
  authenticate(
    params: { reason?: string },
    callback?: (success: boolean, token?: string) => void,
  ): TelegramBiometricManager;
  updateBiometricToken(
    token: string,
    callback?: (saved: boolean) => void,
  ): TelegramBiometricManager;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show(): TelegramBackButton;
  hide(): TelegramBackButton;
  onClick(callback: () => void): TelegramBackButton;
  offClick(callback: () => void): TelegramBackButton;
}

export interface TelegramPopupButton {
  id?: string;
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text?: string;
}

export interface TelegramPopupParams {
  title?: string;
  message: string;
  buttons?: TelegramPopupButton[];
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  ready(): void;
  expand(): void;
  themeParams: TelegramThemeParams;
  colorScheme: 'light' | 'dark';
  CloudStorage: TelegramCloudStorage;
  HapticFeedback?: TelegramHapticFeedback;
  BackButton?: TelegramBackButton;
  disableVerticalSwipes?(): void;
  onEvent?(name: string, callback: () => void): void;
  showAlert?(message: string, callback?: () => void): void;
  showConfirm?(message: string, callback?: (ok: boolean) => void): void;
  showPopup?(params: TelegramPopupParams, callback?: (buttonId: string) => void): void;
  addToHomeScreen?(): void;
  checkHomeScreenStatus?(callback: (status: string) => void): void;
  BiometricManager?: TelegramBiometricManager;
}

import { LocalforageDriver } from './local';
import { TelegramDriver } from './telegram';

export interface StorageDriver {
  save<T>(key: string, value: T): Promise<void>;
  load<T>(key: string, fallback: T): Promise<T>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

function pickDriver(): StorageDriver {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  if (tg && tg.initData && tg.CloudStorage) {
    return new TelegramDriver(tg.CloudStorage);
  }
  return new LocalforageDriver();
}

export const storage: StorageDriver = pickDriver();

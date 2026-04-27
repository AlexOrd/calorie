import localforage from 'localforage';
import type { StorageDriver } from './index';

localforage.config({
  name: 'calorie',
  storeName: 'state',
  description: 'Calorie local-first store',
});

export class LocalforageDriver implements StorageDriver {
  async save<T>(key: string, value: T): Promise<void> {
    await localforage.setItem(key, JSON.stringify(value));
  }

  async load<T>(key: string, fallback: T): Promise<T> {
    const raw = await localforage.getItem<string>(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async remove(key: string): Promise<void> {
    await localforage.removeItem(key);
  }

  async keys(): Promise<string[]> {
    return localforage.keys();
  }
}

import type { StorageDriver } from './index';

export class TelegramDriver implements StorageDriver {
  constructor(private readonly cs: TelegramCloudStorage) {}

  save<T>(key: string, value: T): Promise<void> {
    const payload = JSON.stringify(value);
    return new Promise((resolve, reject) => {
      this.cs.setItem(key, payload, (err) => (err ? reject(err) : resolve()));
    });
  }

  load<T>(key: string, fallback: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.cs.getItem(key, (err, value) => {
        if (err) return reject(err);
        if (value === null || value === undefined || value === '') return resolve(fallback);
        try {
          resolve(JSON.parse(value) as T);
        } catch {
          resolve(fallback);
        }
      });
    });
  }

  remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cs.removeItem(key, (err) => (err ? reject(err) : resolve()));
    });
  }

  keys(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.cs.getKeys((err, keys) => (err ? reject(err) : resolve(keys)));
    });
  }
}

// Native Telegram dialogs with DOM fallback for browser dev mode.

export function confirmAsync(message: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const tg = window.Telegram?.WebApp;
  if (tg && tg.showConfirm) {
    return new Promise<boolean>((resolve) => {
      tg.showConfirm?.(message, (ok) => resolve(ok));
    });
  }
  return Promise.resolve(window.confirm(message));
}

export function alertAsync(message: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const tg = window.Telegram?.WebApp;
  if (tg && tg.showAlert) {
    return new Promise<void>((resolve) => {
      tg.showAlert?.(message, () => resolve());
    });
  }
  window.alert(message);
  return Promise.resolve();
}

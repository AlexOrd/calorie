export type ThemeMode = 'light' | 'dark';

export function resolveThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const tg = window.Telegram?.WebApp;
  if (tg?.colorScheme === 'light' || tg?.colorScheme === 'dark') {
    return tg.colorScheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

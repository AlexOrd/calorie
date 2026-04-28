import type { TelegramWebApp } from '$types/telegram';

export type ThemeMode = 'light' | 'dark';

const TG_VAR_NAMES = ['--tg-bg', '--tg-fg', '--tg-hint', '--tg-link'] as const;

// Known default Telegram theme bg colors across iOS / Android / Desktop.
// When the bg matches one of these we treat the theme as "default" and
// let our Claude palette take over instead of bridging Telegram colors.
const DEFAULT_BGS = new Set([
  '#ffffff',
  '#fff',
  '#000000',
  '#000',
  '#212121',
  '#17212b',
  '#0e1621',
  '#18222d',
  '#1c1c1d',
  '#1c1c1e',
]);

function normalizeHex(hex: string | undefined): string | null {
  if (!hex) return null;
  return hex.trim().toLowerCase().replace(/\s/g, '');
}

export function isDefaultTelegramTheme(tg: TelegramWebApp): boolean {
  const bg = normalizeHex(tg.themeParams.bg_color);
  if (!bg) return true;
  return DEFAULT_BGS.has(bg);
}

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

// Bridge Telegram's themeParams into --tg-* CSS vars when the theme is
// custom; clear them otherwise so the Claude fallback in app.css wins.
export function applyTelegramPalette(): void {
  const root = document.documentElement.style;
  const tg = window.Telegram?.WebApp;

  if (!tg || isDefaultTelegramTheme(tg)) {
    for (const name of TG_VAR_NAMES) root.removeProperty(name);
    return;
  }

  const t = tg.themeParams;
  if (t.bg_color) root.setProperty('--tg-bg', t.bg_color);
  else root.removeProperty('--tg-bg');
  if (t.text_color) root.setProperty('--tg-fg', t.text_color);
  else root.removeProperty('--tg-fg');
  if (t.hint_color) root.setProperty('--tg-hint', t.hint_color);
  else root.removeProperty('--tg-hint');
  if (t.link_color) root.setProperty('--tg-link', t.link_color);
  else root.removeProperty('--tg-link');
}

import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { applyTelegramPalette, applyThemeMode, resolveThemeMode } from '$lib/theme';
import { captureBeforeInstallPrompt } from '$lib/install';

function bootTelegram(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
}

function watchTheme(): void {
  applyTelegramPalette();
  applyThemeMode(resolveThemeMode());

  const tg = window.Telegram?.WebApp;
  tg?.onEvent?.('themeChanged', () => {
    applyTelegramPalette();
    applyThemeMode(resolveThemeMode());
  });

  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => applyThemeMode(resolveThemeMode()));
  }
}

bootTelegram();
watchTheme();
captureBeforeInstallPrompt();

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element in index.html');

mount(App, { target });

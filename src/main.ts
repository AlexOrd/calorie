import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

function applyTelegramTheme(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
  const t = tg.themeParams;
  const root = document.documentElement.style;
  if (t.bg_color) root.setProperty('--tg-bg', t.bg_color);
  if (t.text_color) root.setProperty('--tg-fg', t.text_color);
  if (t.hint_color) root.setProperty('--tg-hint', t.hint_color);
  if (t.link_color) root.setProperty('--tg-link', t.link_color);
}

applyTelegramTheme();

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element in index.html');

mount(App, { target });

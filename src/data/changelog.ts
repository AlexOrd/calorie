import type { ChangelogEntry } from '$types/changelog';

export const changelog: readonly ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-04-29',
    items: [
      {
        type: 'major',
        icon: 'Droplet',
        title: 'Гідрація',
        body: 'Стеж за водою поряд із кроками. Швидкі +250 мл, ціль на основі ваги, нова смужка в heatmap.',
      },
      { type: 'feature', text: 'BMI-показник на сторінці статистики' },
      { type: 'feature', text: 'Оновлений вигляд статистики на мобільному' },
      { type: 'feature', text: 'Підказки до формул у модальному вікні' },
    ],
  },
] as const;

export const APP_VERSION: string = changelog[0]?.version ?? '0.0.0';

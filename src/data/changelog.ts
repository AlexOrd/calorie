import type { ChangelogEntry } from '$types/changelog';

export const changelog: readonly ChangelogEntry[] = [
  {
    version: '0.2.1',
    date: '2026-04-29',
    items: [
      {
        type: 'major',
        icon: 'BarChart3',
        title: 'Зрозуміло, куди йдуть калорії',
        body: 'Нова розбивка "Спалено за день" на статистиці показує, як BMR, кроки і тренування додаються в загальну витрату — і чому активний день дає більший дефіцит.',
      },
      { type: 'feature', text: 'Калорії та вода в одному рядку на дашборді' },
      { type: 'feature', text: 'Іконки категорій на дашборді' },
      { type: 'feature', text: 'Швидкі кнопки +1k/+3k/+5k для кроків та +250/+500/+1 л для води' },
      { type: 'feature', text: 'Опис тренувань: ~30 хв легкого = +120 ккал' },
    ],
  },
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

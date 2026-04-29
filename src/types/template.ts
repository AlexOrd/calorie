import type { CategoryKey } from './food';

export interface MealTemplateItem {
  cat: CategoryKey;
  id: string;
  pct: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: readonly MealTemplateItem[];
}

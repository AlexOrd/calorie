export type CategoryKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface FoodItem {
  name: string;
  max_g: number;
  unit?: string;
}

export interface FoodCategory {
  title: string;
  color: string;
  items: Record<string, FoodItem>;
}

export type FoodDb = Record<CategoryKey, FoodCategory>;

export const CATEGORY_KEYS: readonly CategoryKey[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
] as const;

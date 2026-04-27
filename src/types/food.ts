export type CategoryKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem {
  name: string;
  max_g: number;
  unit?: string;
  /**
   * Macros override for this specific item.
   * - If unit is 'г' (default), values are per 100g (overrides the category default).
   * - If unit is 'шт' (pieces), values are per piece.
   */
  macros?: Macros;
}

export interface FoodCategory {
  title: string;
  color: string;
  /** Default per-100g macros for items in this category that don't override. */
  macros: Macros;
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

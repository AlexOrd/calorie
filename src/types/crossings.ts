export type Macro = 'kcal' | 'protein' | 'carbs' | 'fat';

export type MacroState = 'under' | 'hit' | 'over';

export interface DayCrossings {
  kcal: MacroState;
  protein: MacroState;
  carbs: MacroState;
  fat: MacroState;
  categories: Record<string, 'under' | 'over'>;
}

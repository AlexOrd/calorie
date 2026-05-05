import type { DayActivity } from './activity';
import type { Macros } from './food';

export type RecapBalanceState = 'deficit' | 'balanced' | 'surplus';

export interface RecapEntry {
  id: string;
  cat: string;
  name: string;
  pct: number;
  ts: number;
  amount: number;
  unit: string;
}

export interface DayRecapSummary {
  date: string;
  entries: RecapEntry[];
  activity: DayActivity;
  totals: Macros;
  intakeKcal: number;
  burnKcal: number;
  deltaKcal: number;
  balanceState: RecapBalanceState;
  waterTargetMl: number;
  overCategoryCount: number;
  hasAnyData: boolean;
}

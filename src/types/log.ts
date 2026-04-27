import type { CategoryKey } from './food';

export interface LogEntry {
  id: string;
  cat: CategoryKey;
  pct: number;
  ts: number;
}

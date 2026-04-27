export function nowIso(): string {
  return new Date().toISOString();
}

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

export function startOfWeek(key: string): string {
  // ISO week starting Monday.
  const d = dateFromKey(key);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return todayKey(d);
}

export function rangeDays(fromKey: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(addDays(fromKey, i));
  return out;
}

export function isLogKey(key: string): boolean {
  return /^log_\d{4}-\d{2}-\d{2}$/.test(key);
}

export function dateFromLogKey(key: string): string | null {
  const m = key.match(/^log_(\d{4}-\d{2}-\d{2})$/);
  return m && m[1] ? m[1] : null;
}

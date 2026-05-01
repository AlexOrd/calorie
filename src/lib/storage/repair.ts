import type { DayActivity } from '$types/activity';
import type { DayCrossings, MacroState } from '$types/crossings';
import type { CategoryKey } from '$types/food';
import type { LogEntry } from '$types/log';
import type { ActivityLevel, Gender, ProfileInput, UserProfile } from '$types/profile';
import type { MealTemplate, MealTemplateItem } from '$types/template';
import { dateFromKey } from '$lib/date';

// Pure validators that run against raw storage values (typed as `unknown`)
// and return a coerced/cleaned shape plus a `changed` flag. Each store calls
// its repair function on load and writes the cleaned value back when
// `changed === true`. No I/O happens here — these are referentially
// transparent so they're trivial to reason about.

export interface RepairResult<T> {
  value: T;
  changed: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ACTIVITY_LEVELS: readonly ActivityLevel[] = [1.2, 1.375, 1.55, 1.725];

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function toCategoryKey(x: unknown): CategoryKey | null {
  if (typeof x !== 'string') return null;
  switch (x) {
    case 'A':
    case 'B':
    case 'C':
    case 'D':
    case 'E':
    case 'F':
    case 'G':
    case 'H':
      return x;
    default:
      return null;
  }
}

function toGender(x: unknown): Gender | null {
  if (x === 'male' || x === 'female') return x;
  return null;
}

function toActivityLevel(x: unknown): ActivityLevel | null {
  if (!isFiniteNumber(x)) return null;
  for (const lvl of ACTIVITY_LEVELS) {
    if (lvl === x) return lvl;
  }
  return null;
}

function toTrainings(x: unknown): 0 | 1 | 2 | 3 {
  if (!isFiniteNumber(x)) return 0;
  const t = Math.round(clamp(x, 0, 3));
  if (t === 1) return 1;
  if (t === 2) return 2;
  if (t === 3) return 3;
  return 0;
}

// ----- log_YYYY-MM-DD -----------------------------------------------------

export function repairLog(raw: unknown, dateIso: string): RepairResult<LogEntry[]> {
  if (!Array.isArray(raw)) {
    // Anything other than an array is unusable — treat as empty, mark
    // changed only if the slot held something we just discarded.
    return { value: [], changed: raw !== null && raw !== undefined };
  }
  let changed = false;
  const out: LogEntry[] = [];

  // Day window for ts validation. Allow ±36h slop to absorb local-timezone
  // drift and the debounce-into-next-day boot-race wrong-day case where
  // entries land in the previous day's key.
  const dayStart = dateFromKey(dateIso).getTime();
  const dayEnd = dayStart + 24 * 3600 * 1000;
  const slop = 36 * 3600 * 1000;
  const noon = dayStart + 12 * 3600 * 1000;

  for (const item of raw) {
    if (!isObject(item)) {
      changed = true;
      continue;
    }
    const cat = toCategoryKey(item.cat);
    if (cat === null) {
      changed = true;
      continue;
    }
    const id = item.id;
    if (typeof id !== 'string' || id.length === 0) {
      changed = true;
      continue;
    }
    if (!isFiniteNumber(item.pct)) {
      changed = true;
      continue;
    }
    const pct = clamp(item.pct, 0, 1000);
    if (pct !== item.pct) changed = true;

    let ts: number;
    if (isFiniteNumber(item.ts)) {
      ts = item.ts;
      if (ts < dayStart - slop || ts > dayEnd + slop) {
        ts = noon;
        changed = true;
      }
    } else {
      ts = noon;
      changed = true;
    }

    out.push({ id, cat, pct, ts });
  }

  // Dedupe colliding ts — `dailyLog.remove(ts)` keys off ts, so duplicates
  // cause both entries to disappear at once.
  const seen = new Set<number>();
  const deduped: LogEntry[] = [];
  for (const entry of out) {
    let { ts } = entry;
    while (seen.has(ts)) {
      ts++;
      changed = true;
    }
    seen.add(ts);
    deduped.push({ ...entry, ts });
  }

  if (deduped.length !== raw.length) changed = true;
  return { value: deduped, changed };
}

// ----- activity_YYYY-MM-DD ------------------------------------------------

const EMPTY_ACTIVITY: DayActivity = { steps: 0, trainings: 0, waterMl: 0 };

export function repairActivity(raw: unknown): RepairResult<DayActivity> {
  if (raw === null || raw === undefined) {
    return { value: { ...EMPTY_ACTIVITY }, changed: false };
  }
  if (!isObject(raw)) {
    return { value: { ...EMPTY_ACTIVITY }, changed: true };
  }
  let changed = false;

  const stepsRaw = raw.steps;
  let steps = 0;
  if (isFiniteNumber(stepsRaw)) {
    steps = Math.max(0, Math.round(stepsRaw));
    if (steps !== stepsRaw) changed = true;
  } else if (stepsRaw !== undefined) {
    changed = true;
  }

  const waterRaw = raw.waterMl;
  let waterMl = 0;
  if (isFiniteNumber(waterRaw)) {
    waterMl = Math.max(0, Math.round(waterRaw));
    if (waterMl !== waterRaw) changed = true;
  } else if (waterRaw !== undefined) {
    changed = true;
  }

  let trainings: 0 | 1 | 2 | 3;
  if (raw.trainings !== undefined) {
    trainings = toTrainings(raw.trainings);
    if (trainings !== raw.trainings) changed = true;
  } else if (raw.strength === true) {
    trainings = 1;
    changed = true; // legacy strength: boolean → trainings number
  } else if (raw.strength !== undefined) {
    trainings = 0;
    changed = true;
  } else {
    trainings = 0;
  }

  return { value: { steps, trainings, waterMl }, changed };
}

// ----- user_profile -------------------------------------------------------

export function repairProfile(raw: unknown): RepairResult<UserProfile | null> {
  if (raw === null || raw === undefined) return { value: null, changed: false };
  if (!isObject(raw)) return { value: null, changed: true };

  let changed = false;

  if (!isFiniteNumber(raw.height) || raw.height < 50 || raw.height > 250) {
    return { value: null, changed: true };
  }
  if (!isFiniteNumber(raw.weight) || raw.weight < 20 || raw.weight > 400) {
    return { value: null, changed: true };
  }
  if (!isFiniteNumber(raw.age) || raw.age < 1 || raw.age > 130) {
    return { value: null, changed: true };
  }
  const gender = toGender(raw.gender);
  if (gender === null) return { value: null, changed: true };
  const activity = toActivityLevel(raw.activity);
  if (activity === null) return { value: null, changed: true };

  const k_factor = isFiniteNumber(raw.k_factor) && raw.k_factor > 0 ? raw.k_factor : 1;
  if (k_factor !== raw.k_factor) changed = true;

  const last_updated =
    typeof raw.last_updated === 'string' && raw.last_updated.length > 0
      ? raw.last_updated
      : new Date().toISOString();
  if (last_updated !== raw.last_updated) changed = true;

  const input: ProfileInput = {
    height: raw.height,
    weight: raw.weight,
    gender,
    age: raw.age,
    activity,
  };

  if (
    isFiniteNumber(raw.target_weight_kg) &&
    raw.target_weight_kg >= 20 &&
    raw.target_weight_kg <= 400
  ) {
    input.target_weight_kg = raw.target_weight_kg;
  } else if (raw.target_weight_kg !== undefined) {
    changed = true;
  }

  if (isFiniteNumber(raw.waist_cm) && raw.waist_cm >= 10 && raw.waist_cm <= 300) {
    input.waist_cm = raw.waist_cm;
  } else if (raw.waist_cm !== undefined) {
    changed = true;
  }
  if (isFiniteNumber(raw.neck_cm) && raw.neck_cm >= 10 && raw.neck_cm <= 300) {
    input.neck_cm = raw.neck_cm;
  } else if (raw.neck_cm !== undefined) {
    changed = true;
  }
  if (isFiniteNumber(raw.hip_cm) && raw.hip_cm >= 10 && raw.hip_cm <= 300) {
    input.hip_cm = raw.hip_cm;
  } else if (raw.hip_cm !== undefined) {
    changed = true;
  }

  const next: UserProfile = { ...input, k_factor, last_updated };
  if (typeof raw.biometric_lock === 'boolean') {
    next.biometric_lock = raw.biometric_lock;
  } else if (raw.biometric_lock !== undefined) {
    changed = true;
  }

  return { value: next, changed };
}

// ----- weight_log ---------------------------------------------------------

export function repairWeightLog(raw: unknown): RepairResult<Record<string, number>> {
  if (!isObject(raw)) {
    return { value: {}, changed: raw !== null && raw !== undefined };
  }
  let changed = false;
  const out: Record<string, number> = {};
  for (const [iso, kg] of Object.entries(raw)) {
    if (!ISO_DATE.test(iso)) {
      changed = true;
      continue;
    }
    if (!isFiniteNumber(kg)) {
      changed = true;
      continue;
    }
    const safe = clamp(Math.round(kg * 10) / 10, 20, 400);
    if (safe !== kg) changed = true;
    out[iso] = safe;
  }
  return { value: out, changed };
}

// ----- meal_templates -----------------------------------------------------

function repairTemplateItem(raw: unknown): MealTemplateItem | null {
  if (!isObject(raw)) return null;
  const cat = toCategoryKey(raw.cat);
  if (cat === null) return null;
  const id = raw.id;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (!isFiniteNumber(raw.pct)) return null;
  return { cat, id, pct: clamp(raw.pct, 0, 1000) };
}

export function repairTemplates(raw: unknown): RepairResult<MealTemplate[]> {
  if (!Array.isArray(raw)) {
    return { value: [], changed: raw !== null && raw !== undefined };
  }
  let changed = false;
  const out: MealTemplate[] = [];
  for (const t of raw) {
    if (!isObject(t)) {
      changed = true;
      continue;
    }
    const id = t.id;
    if (typeof id !== 'string' || id.length === 0) {
      changed = true;
      continue;
    }
    const name = typeof t.name === 'string' && t.name.length > 0 ? t.name : 'Без назви';
    if (name !== t.name) changed = true;
    if (!Array.isArray(t.items)) {
      changed = true;
      continue;
    }
    const items: MealTemplateItem[] = [];
    for (const item of t.items) {
      const repaired = repairTemplateItem(item);
      if (repaired === null) {
        changed = true;
        continue;
      }
      if (
        !isObject(item) ||
        repaired.cat !== item.cat ||
        repaired.id !== item.id ||
        repaired.pct !== item.pct
      ) {
        changed = true;
      }
      items.push(repaired);
    }
    if (items.length === 0) {
      changed = true;
      continue;
    }
    out.push({ id, name, items });
  }
  return { value: out, changed };
}

// ----- crossings:YYYY-MM-DD -----------------------------------------------

function toMacroState(x: unknown): MacroState {
  if (x === 'hit' || x === 'over') return x;
  return 'under';
}

function toCategoryState(x: unknown): 'under' | 'over' {
  if (x === 'over') return 'over';
  return 'under';
}

export function repairCrossings(raw: unknown): RepairResult<DayCrossings> {
  const empty: DayCrossings = {
    kcal: 'under',
    protein: 'under',
    carbs: 'under',
    fat: 'under',
    categories: {},
  };
  if (raw === null || raw === undefined) return { value: empty, changed: false };
  if (!isObject(raw)) return { value: empty, changed: true };

  let changed = false;
  const kcal = toMacroState(raw.kcal);
  if (kcal !== raw.kcal) changed = true;
  const protein = toMacroState(raw.protein);
  if (protein !== raw.protein) changed = true;
  const carbs = toMacroState(raw.carbs);
  if (carbs !== raw.carbs) changed = true;
  const fat = toMacroState(raw.fat);
  if (fat !== raw.fat) changed = true;

  const categories: Record<string, 'under' | 'over'> = {};
  if (isObject(raw.categories)) {
    for (const [key, value] of Object.entries(raw.categories)) {
      const cat = toCategoryKey(key);
      if (cat === null) {
        changed = true;
        continue;
      }
      const state = toCategoryState(value);
      if (state !== value) changed = true;
      categories[cat] = state;
    }
  } else if (raw.categories !== undefined) {
    changed = true;
  }

  return { value: { kcal, protein, carbs, fat, categories }, changed };
}

// ----- last_shown_changelog_version --------------------------------------

export function repairChangelogVersion(raw: unknown): RepairResult<string | null> {
  if (raw === null || raw === undefined) return { value: null, changed: false };
  if (typeof raw === 'string' && SEMVER.test(raw)) return { value: raw, changed: false };
  return { value: null, changed: true };
}

import { storage } from '$lib/storage';
import type { MealTemplate, MealTemplateItem } from '$types/template';
import type { LogEntry } from '$types/log';

const KEY = 'meal_templates';
// Telegram CloudStorage caps a key at ~4 KB. A 5-item template serialises to
// ~250–350 bytes, so 10 templates is the comfortable ceiling.
export const MAX_TEMPLATES = 10;

export async function loadTemplates(): Promise<MealTemplate[]> {
  const raw = await storage.load<MealTemplate[]>(KEY, []);
  return Array.isArray(raw) ? raw : [];
}

export async function saveTemplate(
  name: string,
  items: readonly MealTemplateItem[],
): Promise<MealTemplate> {
  const list = await loadTemplates();
  const next: MealTemplate = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Без назви',
    items: items.map((i) => ({ cat: i.cat, id: i.id, pct: i.pct })),
  };
  const updated = [next, ...list].slice(0, MAX_TEMPLATES);
  await storage.save(KEY, updated);
  return next;
}

export async function deleteTemplate(id: string): Promise<MealTemplate[]> {
  const list = await loadTemplates();
  const updated = list.filter((t) => t.id !== id);
  await storage.save(KEY, updated);
  return updated;
}

export function templateToEntries(template: MealTemplate, baseTs: number): LogEntry[] {
  return template.items.map((item, idx) => ({
    cat: item.cat,
    id: item.id,
    pct: item.pct,
    ts: baseTs + idx,
  }));
}

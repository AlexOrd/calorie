import { Sparkles, Droplet, Activity, BarChart3, Bell, Wrench } from '@lucide/svelte';

export const CHANGELOG_ICONS = {
  Sparkles,
  Droplet,
  Activity,
  BarChart3,
  Bell,
  Wrench,
} as const;

export type ChangelogIconName = keyof typeof CHANGELOG_ICONS;

export interface MajorItem {
  type: 'major';
  title: string;
  body: string;
  icon?: ChangelogIconName;
}

export interface MinorItem {
  type: 'feature' | 'fix';
  text: string;
}

export type ChangelogItem = MajorItem | MinorItem;

export interface ChangelogEntry {
  version: string;
  date: string; // 'YYYY-MM-DD'
  items: readonly ChangelogItem[];
}

import {
  LayoutDashboard,
  NotebookPen,
  Activity,
  BarChart3,
  User,
  type Icon as LucideIcon,
} from '@lucide/svelte';

export type TabKey = 'dashboard' | 'journal' | 'activity' | 'stats' | 'profile';

export interface NavItem {
  key: TabKey;
  label: string;
  icon: typeof LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Раціон', icon: LayoutDashboard },
  { key: 'journal', label: 'Журнал', icon: NotebookPen },
  { key: 'activity', label: 'Активність', icon: Activity },
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
  { key: 'profile', label: 'Профіль', icon: User },
] as const;

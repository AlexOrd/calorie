import { toBlob } from 'html-to-image';

export interface WeeklyCardData {
  weekStartIso: string;
  weekEndIso: string;
  totalDeltaKcal: number;
  perDayDelta: number[]; // length 7, oldest → newest
  deficitDays: number;
  waterTargetHits: number;
  cleanCategoryDays: number;
  appVersion: string;
}

export async function exportWeeklyCard(node: HTMLElement): Promise<Blob | null> {
  const blob = await toBlob(node, {
    width: 1080,
    height: 1920,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: 'transparent',
  });
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

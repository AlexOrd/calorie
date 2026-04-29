import { animate } from 'motion';
import confetti from 'canvas-confetti';
import { hapticImpact, hapticNotify } from '$lib/haptics';

function getCSSVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Haptics fire regardless of prefers-reduced-motion — they are non-visual
// and often serve as accessibility GAINS (replacing visual cues for users
// who reduce visual motion). Reduced motion gates only the visual animate().

export function pulseSuccess(el: HTMLElement): void {
  hapticImpact('light');
  if (reducedMotion()) return;
  void animate(el, { scale: [1, 1.04, 1] }, { duration: 0.35, ease: 'easeOut' });
}

export function pulseWarning(el: HTMLElement): void {
  hapticNotify('warning');
  if (reducedMotion()) return;
  void animate(
    el,
    {
      scale: [1, 1.03, 1],
      boxShadow: [
        '0 0 0 0 rgba(239,68,68,0)',
        '0 0 0 8px rgba(239,68,68,0.45)',
        '0 0 0 0 rgba(239,68,68,0)',
      ],
    },
    { duration: 0.7, ease: 'easeOut' },
  );
}

export function celebrate(el: HTMLElement): void {
  hapticNotify('success');
  if (reducedMotion()) return;
  void animate(
    el,
    {
      scale: [1, 1.06, 1],
      boxShadow: [
        '0 0 0 0 rgba(76,175,80,0)',
        '0 0 0 12px rgba(76,175,80,0.35)',
        '0 0 0 0 rgba(76,175,80,0)',
      ],
    },
    { duration: 0.7, ease: 'easeOut' },
  );
}

export function shakeWarning(el: HTMLElement): void {
  hapticNotify('warning');
  if (reducedMotion()) return;
  void animate(el, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.45, ease: 'easeOut' });
  void animate(
    el,
    {
      boxShadow: [
        '0 0 0 0 rgba(193,74,58,0)',
        '0 0 0 8px rgba(193,74,58,0.4)',
        '0 0 0 0 rgba(193,74,58,0)',
      ],
    },
    { duration: 0.6, ease: 'easeOut' },
  );
}

export function burstConfetti(originEl: HTMLElement): void {
  hapticNotify('success');
  const rect = originEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const x = Math.min(1, Math.max(0, (rect.right - 12) / window.innerWidth));
  const y = Math.min(1, Math.max(0, (rect.top + rect.height / 2) / window.innerHeight));
  void confetti({
    particleCount: 12,
    spread: 35,
    startVelocity: 25,
    decay: 0.92,
    ticks: 80,
    origin: { x, y },
    colors: [
      getCSSVar('--accent') || '#c96442',
      getCSSVar('--ok') || '#4a7a3a',
      getCSSVar('--warn') || '#b8862a',
    ],
    disableForReducedMotion: true,
  });
}

export function flashEdge(el: HTMLElement): void {
  hapticImpact('medium');
  if (reducedMotion()) return;
  const accent = (getCSSVar('--accent') || '#c96442') + '66';
  void animate(
    el,
    {
      boxShadow: [
        'inset 0 0 0 0 rgba(0,0,0,0)',
        `inset 0 0 0 4px ${accent}`,
        'inset 0 0 0 0 rgba(0,0,0,0)',
      ],
    },
    { duration: 0.5, ease: 'easeOut' },
  );
}

import { animate } from 'motion';

export function pulseSuccess(el: HTMLElement): void {
  void animate(el, { scale: [1, 1.04, 1] }, { duration: 0.35, ease: 'easeOut' });
}

export function pulseWarning(el: HTMLElement): void {
  void animate(
    el,
    {
      scale: [1, 1.03, 1],
      boxShadow: [
        '0 0 0 0 rgba(239,68,68,0)',
        '0 0 0 6px rgba(239,68,68,0.35)',
        '0 0 0 0 rgba(239,68,68,0)',
      ],
    },
    { duration: 0.5, ease: 'easeOut' },
  );
}

export function celebrate(el: HTMLElement): void {
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

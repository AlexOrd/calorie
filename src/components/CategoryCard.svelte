<script lang="ts">
  import { Spring } from 'svelte/motion';
  import { pulseWarning } from '$lib/anim';
  import type { CategoryKey } from '$types/food';

  let { categoryKey, title, color, consumed, onClick } = $props<{
    categoryKey: CategoryKey;
    title: string;
    color: string;
    consumed: number;
    onClick: (key: CategoryKey) => void;
  }>();

  const fill = new Spring(0, { stiffness: 0.15, damping: 0.8 });

  let cardEl = $state<HTMLButtonElement | undefined>(undefined);
  let prevOver = false;

  $effect(() => {
    fill.target = Math.min(consumed, 150);
  });

  $effect(() => {
    const over = consumed > 100;
    if (over && !prevOver && cardEl) {
      pulseWarning(cardEl);
    }
    prevOver = over;
  });

  let displayPct = $derived(fill.current);
  let over = $derived(consumed > 100);
  let remaining = $derived(Math.max(0, 100 - Math.round(consumed)));
  let overshoot = $derived(Math.max(0, Math.round(consumed - 100)));
</script>

<button
  bind:this={cardEl}
  type="button"
  class="flex w-full flex-col items-start gap-2 rounded-lg border border-white/10 bg-white/2 p-4 text-left transition-colors hover:bg-white/5"
  onclick={() => onClick(categoryKey)}
>
  <div class="flex w-full items-center justify-between">
    <span class="text-base font-semibold">{categoryKey} — {title}</span>
    <span class="text-muted text-xs">
      {#if over}<span class="text-danger">+{overshoot}%</span>
      {:else}{remaining}% залишилось{/if}
    </span>
  </div>

  <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
    <div
      class="h-full rounded-full"
      style="width: {Math.min(displayPct, 100)}%; background: {over
        ? 'var(--color-danger)'
        : color};"
    ></div>
  </div>
</button>

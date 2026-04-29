<script lang="ts">
  import { Spring } from 'svelte/motion';
  import { pulseWarning } from '$lib/anim';
  import { hapticImpact } from '$lib/haptics';
  import { activeDate } from '$state/activeDate.svelte';
  import { macroCrossings } from '$state/macroCrossings.svelte';
  import type { CategoryKey } from '$types/food';

  interface Props {
    categoryKey: CategoryKey;
    title: string;
    color: string;
    consumed: number;
    onClick: (key: CategoryKey) => void;
  }
  let { categoryKey, title, color, consumed, onClick }: Props = $props();

  const fill = new Spring(0, { stiffness: 0.15, damping: 0.8 });

  let cardEl = $state<HTMLButtonElement | undefined>(undefined);

  $effect(() => {
    fill.target = Math.min(consumed, 150);
  });

  $effect(() => {
    const date = activeDate.value;
    if (!macroCrossings.isLoaded(date)) return;
    const next: 'under' | 'over' = consumed > 100 ? 'over' : 'under';
    const prev = macroCrossings.categoryState(date, categoryKey);
    if (next === prev) return;
    void macroCrossings.setCategory(date, categoryKey, next);
    if (prev === 'under' && next === 'over' && cardEl) {
      pulseWarning(cardEl);
    }
  });

  let displayPct = $derived(fill.current);
  let over = $derived(consumed > 100);
  let remaining = $derived(Math.max(0, 100 - Math.round(consumed)));
  let overshoot = $derived(Math.max(0, Math.round(consumed - 100)));
</script>

<button
  bind:this={cardEl}
  type="button"
  class="border-border bg-surface-2 hover:bg-surface active:bg-surface flex min-h-20 w-full flex-col items-start justify-center gap-2.5 rounded-xl border p-5 text-left transition-colors"
  onclick={() => {
    hapticImpact('light');
    onClick(categoryKey);
  }}
>
  <div class="flex w-full items-center justify-between gap-2">
    <span class="text-lg font-semibold">{categoryKey} — {title}</span>
    <span class="text-muted text-sm whitespace-nowrap">
      {#if over}<span class="text-danger font-semibold">+{overshoot}%</span>
      {:else}{remaining}% залишилось{/if}
    </span>
  </div>

  <div class="bg-surface-2 h-3 w-full overflow-hidden rounded-full">
    <div
      class="h-full rounded-full transition-[background] duration-200"
      style="width: {Math.min(displayPct, 100)}%; background: {over
        ? 'var(--color-danger)'
        : color};"
    ></div>
  </div>
</button>

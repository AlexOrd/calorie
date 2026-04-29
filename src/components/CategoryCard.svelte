<script lang="ts">
  import { Spring } from 'svelte/motion';
  import { Wheat, Drumstick, Carrot, Soup, Milk, Apple, Nut, CakeSlice } from '@lucide/svelte';
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

  const ICON_BY_KEY = {
    A: Wheat,
    B: Drumstick,
    C: Carrot,
    D: Soup,
    E: Milk,
    F: Apple,
    G: Nut,
    H: CakeSlice,
  } as const;

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
  let overshoot = $derived(Math.max(0, Math.round(consumed - 100)));
  let pctRounded = $derived(Math.round(consumed));
  let Icon = $derived(ICON_BY_KEY[categoryKey]);
</script>

<button
  bind:this={cardEl}
  type="button"
  class="border-border bg-surface-2 hover:bg-surface active:bg-surface flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors"
  onclick={() => {
    hapticImpact('light');
    onClick(categoryKey);
  }}
>
  <div
    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
    style="background-color: color-mix(in oklab, {color} 18%, transparent); color: {color};"
  >
    <Icon size={24} />
  </div>

  <div class="flex min-w-0 flex-1 flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-2">
      <div class="flex min-w-0 items-baseline gap-1.5">
        <span class="text-muted text-[10px] font-bold tracking-wider uppercase tabular-nums">
          {categoryKey}
        </span>
        <span class="text-fg truncate text-sm font-semibold">{title}</span>
      </div>
      <span class="shrink-0 text-xs whitespace-nowrap tabular-nums">
        {#if over}
          <span class="text-danger font-semibold">+{overshoot}%</span>
        {:else}
          <span class="text-muted">{pctRounded}%</span>
        {/if}
      </span>
    </div>

    <div class="bg-surface h-1.5 w-full overflow-hidden rounded-full">
      <div
        class="h-full rounded-full transition-[background] duration-200"
        style="width: {Math.min(displayPct, 100)}%; background: {over
          ? 'var(--color-danger)'
          : color};"
      ></div>
    </div>
  </div>
</button>

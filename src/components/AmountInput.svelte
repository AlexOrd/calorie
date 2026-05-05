<script lang="ts">
  import { clearZeroOnFocus } from '$lib/input';
  import type { FoodItem } from '$types/food';

  interface Props {
    item: FoodItem;
    pct: number;
  }
  let { item, pct = $bindable(0) }: Props = $props();

  const unit = $derived(item.unit ?? 'г');
  const isPieces = $derived(unit === 'шт');
  const step = $derived(isPieces ? 1 : 5);

  let amount = $state(0);
  let lastEdited = $state<'pct' | 'amount'>('pct');

  $effect(() => {
    if (lastEdited === 'pct') {
      const a = (item.max_g * pct) / 100;
      amount = isPieces ? Math.round(a) : Math.round(a / step) * step;
    }
  });

  $effect(() => {
    if (lastEdited === 'amount' && item.max_g > 0) {
      pct = (amount / item.max_g) * 100;
    }
  });

  function onPctInput(): void {
    lastEdited = 'pct';
  }

  function onAmountInput(): void {
    lastEdited = 'amount';
  }

  let sliderColor = $derived(
    pct > 100 ? 'var(--color-danger)' : pct > 70 ? 'var(--color-warn)' : 'var(--color-ok)',
  );
  let sliderPct = $derived(Math.min(100, (pct / 150) * 100));
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center gap-3">
    <input
      type="number"
      min="0"
      {step}
      bind:value={amount}
      oninput={onAmountInput}
      onfocus={clearZeroOnFocus}
      class="border-border bg-surface focus:border-accent focus:ring-accent/20 min-w-0 flex-1 rounded-lg border px-4 py-3 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
    />
    <span class="text-muted shrink-0 text-lg">{unit}</span>
    <span class="shrink-0 text-2xl font-bold tabular-nums" style="color: {sliderColor};"
      >{Math.round(pct)}%</span
    >
  </div>

  <div style="--slider-color: {sliderColor};">
    <input
      type="range"
      min="0"
      max="150"
      step="1"
      bind:value={pct}
      oninput={onPctInput}
      class="amount-slider h-1 w-full cursor-pointer appearance-none rounded-full"
      style="background: linear-gradient(to right, {sliderColor} {sliderPct.toFixed(
        1,
      )}%, var(--color-border) {sliderPct.toFixed(1)}%);"
    />
  </div>
</div>

<style>
  .amount-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: var(--slider-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    border: none;
  }
  .amount-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: var(--slider-color);
    border: none;
  }
</style>

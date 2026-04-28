<script lang="ts">
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
</script>

<div class="flex flex-col gap-5">
  <input type="range" min="0" max="150" step="1" bind:value={pct} oninput={onPctInput} />

  <div class="flex items-center gap-3">
    <input
      type="number"
      min="0"
      {step}
      bind:value={amount}
      oninput={onAmountInput}
      class="border-border bg-surface focus:border-accent focus:ring-accent/20 w-32 rounded-lg border px-4 py-3 text-lg focus:ring-2 focus:outline-none"
    />
    <span class="text-muted text-lg">{unit}</span>
    <span class="text-accent ml-auto text-2xl font-bold tabular-nums">{Math.round(pct)}%</span>
  </div>
</div>

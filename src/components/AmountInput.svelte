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

<div class="flex flex-col gap-3">
  <input
    type="range"
    min="0"
    max="150"
    step="1"
    bind:value={pct}
    oninput={onPctInput}
    class="w-full"
  />

  <div class="flex items-center gap-2">
    <input
      type="number"
      min="0"
      {step}
      bind:value={amount}
      oninput={onAmountInput}
      class="w-24 rounded-md border border-white/10 bg-transparent px-2 py-1"
    />
    <span class="text-muted text-sm">{unit}</span>
    <span class="ml-auto text-sm tabular-nums">{Math.round(pct)}%</span>
  </div>
</div>

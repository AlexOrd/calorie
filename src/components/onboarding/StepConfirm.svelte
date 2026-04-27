<script lang="ts">
  import type { ProfileInput } from '$types/profile';
  import { computeKFactor, scaleFoodDb } from '$lib/scaling';
  import baseFoodDb from '../../data/foodDb.json';

  interface Props {
    input: ProfileInput;
    onConfirm: () => void;
    onBack: () => void;
  }
  let { input, onConfirm, onBack }: Props = $props();

  const k = $derived(computeKFactor(input));
  const sample = $derived.by(() => {
    const scaled = scaleFoodDb(baseFoodDb, k);
    const item = scaled.A.items.a2;
    return item ? `${item.name}: 100% = ${item.max_g} г` : '';
  });
</script>

<div class="flex flex-col gap-5">
  <h2 class="text-xl font-semibold">Готово</h2>
  <p class="text-muted">
    Ваш персональний коефіцієнт:
    <span class="text-accent text-2xl font-bold">{k.toFixed(2)}</span>
  </p>
  <p class="rounded-md border border-white/10 p-3 text-sm">
    Приклад: {sample}
  </p>
  <div class="flex justify-between gap-3">
    <button
      type="button"
      class="min-h-14 rounded-lg border border-white/10 px-6 py-4 text-base"
      onclick={onBack}
    >
      Назад
    </button>
    <button
      type="button"
      class="bg-accent min-h-14 flex-1 rounded-lg px-6 py-4 text-lg font-semibold text-white shadow-md shadow-black/20"
      onclick={onConfirm}
    >
      Готово
    </button>
  </div>
</div>

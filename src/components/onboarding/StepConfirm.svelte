<script lang="ts">
  import type { ProfileInput } from '$types/profile';
  import { computeKFactor, scaleFoodDb } from '$lib/scaling';
  import baseFoodDb from '../../data/foodDb.json';

  let { input, onConfirm, onBack } = $props<{
    input: ProfileInput;
    onConfirm: () => void;
    onBack: () => void;
  }>();

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
    <button type="button" class="rounded-md border border-white/10 px-4 py-2" onclick={onBack}>
      Назад
    </button>
    <button
      type="button"
      class="bg-accent flex-1 rounded-md px-4 py-2 text-white"
      onclick={onConfirm}
    >
      Готово
    </button>
  </div>
</div>

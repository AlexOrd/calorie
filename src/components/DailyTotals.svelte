<script lang="ts">
  import { dailyLog, itemCount } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { sumMacros } from '$lib/macros';
  import { Flame, Dumbbell, Wheat, Droplet, Utensils } from '@lucide/svelte';

  let totals = $derived(sumMacros(dailyLog.entries, personalizedDb()));
  let count = $derived(itemCount());
</script>

<div class="rounded-md border border-white/10 p-4 md:p-5">
  <h3 class="mb-4 text-sm font-semibold">Сьогодні</h3>

  <div class="grid grid-cols-2 gap-3">
    <div class="bg-accent/10 flex flex-col gap-1 rounded-lg p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Flame size={14} />
        Калорії
      </div>
      <div class="text-accent text-3xl font-bold tabular-nums">{Math.round(totals.kcal)}</div>
      <div class="text-muted text-xs">ккал</div>
    </div>

    <div class="bg-danger/10 flex flex-col gap-1 rounded-lg p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Dumbbell size={14} />
        Білок
      </div>
      <div class="text-danger text-3xl font-bold tabular-nums">{Math.round(totals.protein)}</div>
      <div class="text-muted text-xs">г</div>
    </div>

    <div class="bg-warn/10 flex flex-col gap-1 rounded-lg p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Wheat size={14} />
        Вуглеводи
      </div>
      <div class="text-warn text-3xl font-bold tabular-nums">{Math.round(totals.carbs)}</div>
      <div class="text-muted text-xs">г</div>
    </div>

    <div class="flex flex-col gap-1 rounded-lg bg-blue-500/10 p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Droplet size={14} />
        Жири
      </div>
      <div class="text-3xl font-bold text-blue-400 tabular-nums">{Math.round(totals.fat)}</div>
      <div class="text-muted text-xs">г</div>
    </div>
  </div>

  <div class="text-muted mt-4 flex items-center gap-2 text-xs">
    <Utensils size={14} />
    Записів: {dailyLog.entries.length} · Продуктів: {count}
  </div>
</div>

<script lang="ts">
  import { Flame, Dumbbell, Wheat, Droplet, Utensils } from '@lucide/svelte';
  import { dailyLog, itemCount } from '$state/dailyLog.svelte';
  import { profile } from '$state/profile.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { dailyTargets } from '$lib/scaling';
  import { sumMacros, ZERO_MACROS } from '$lib/macros';
  import type { Macros } from '$types/food';

  let totals = $derived(sumMacros(dailyLog.entries, personalizedDb()));
  let count = $derived(itemCount());

  // If no profile yet, fall back to ZERO so the bars render at 0/0 (won't NaN).
  let targets = $derived<Macros>(profile.value ? dailyTargets(profile.value) : ZERO_MACROS);

  function pct(value: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(150, Math.round((value / target) * 100));
  }

  function bar(value: number, target: number): { width: number; over: boolean } {
    if (target <= 0) return { width: 0, over: false };
    const ratio = value / target;
    return { width: Math.min(100, Math.round(ratio * 100)), over: ratio > 1 };
  }
</script>

<div class="border-border rounded-md border p-4 md:p-5">
  <h3 class="mb-4 text-sm font-semibold">Сьогодні</h3>

  <div class="grid grid-cols-2 gap-3">
    {@render macroCard(
      'kcal',
      'Калорії',
      'ккал',
      totals.kcal,
      targets.kcal,
      'bg-accent/10',
      'text-accent',
      Flame,
    )}
    {@render macroCard(
      'protein',
      'Білок',
      'г',
      totals.protein,
      targets.protein,
      'bg-danger/10',
      'text-danger',
      Dumbbell,
    )}
    {@render macroCard(
      'carbs',
      'Вуглеводи',
      'г',
      totals.carbs,
      targets.carbs,
      'bg-warn/10',
      'text-warn',
      Wheat,
    )}
    {@render macroCard(
      'fat',
      'Жири',
      'г',
      totals.fat,
      targets.fat,
      'bg-blue-500/10',
      'text-blue-400',
      Droplet,
    )}
  </div>

  <div class="text-muted mt-4 flex items-center gap-2 text-xs">
    <Utensils size={14} />
    Записів: {dailyLog.entries.length} · Продуктів: {count}
  </div>
</div>

{#snippet macroCard(
  _key: string,
  label: string,
  unit: string,
  value: number,
  target: number,
  bg: string,
  fg: string,
  Icon: typeof Flame,
)}
  {@const percent = pct(value, target)}
  {@const b = bar(value, target)}
  <div class="flex flex-col gap-2 rounded-lg p-4 {bg}">
    <div class="text-muted flex items-center gap-2 text-xs">
      <Icon size={14} />
      {label}
    </div>
    <div class="flex items-baseline gap-1.5">
      <span class="text-2xl font-bold tabular-nums {fg}">{Math.round(value)}</span>
      {#if target > 0}
        <span class="text-muted text-sm tabular-nums">/ {target}</span>
      {/if}
      <span class="text-muted ml-auto text-xs">{unit}</span>
    </div>
    {#if target > 0}
      <div class="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full">
        <div
          class="h-full rounded-full {b.over ? 'bg-danger' : fg.replace('text-', 'bg-')}"
          style="width: {b.width}%;"
        ></div>
      </div>
      <div class="text-muted text-xs tabular-nums">{percent}% норми</div>
    {/if}
  </div>
{/snippet}

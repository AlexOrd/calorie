<script lang="ts">
  import { Flame, Dumbbell, Wheat, Droplet, Utensils } from '@lucide/svelte';
  import { dailyLog, itemCount } from '$state/dailyLog.svelte';
  import { profile } from '$state/profile.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { activeDate } from '$state/activeDate.svelte';
  import { macroCrossings, type Macro, type MacroState } from '$state/macroCrossings.svelte';
  import { dailyTargets } from '$lib/scaling';
  import { sumMacros, ZERO_MACROS } from '$lib/macros';
  import { burstConfetti, shakeWarning, flashEdge } from '$lib/anim';
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

  // Element refs per macro for animation anchoring.
  let kcalEl = $state<HTMLDivElement | undefined>(undefined);
  let proteinEl = $state<HTMLDivElement | undefined>(undefined);
  let carbsEl = $state<HTMLDivElement | undefined>(undefined);
  let fatEl = $state<HTMLDivElement | undefined>(undefined);

  // 5% dead band on kcal so a 1-kcal overshoot doesn't shake.
  function kcalState(consumed: number, target: number): MacroState {
    if (target <= 0) return 'under';
    if (consumed > target * 1.05) return 'over';
    if (consumed >= target) return 'hit';
    return 'under';
  }

  function nonKcalState(consumed: number, target: number): MacroState {
    if (target <= 0) return 'under';
    return consumed >= target ? 'hit' : 'under';
  }

  $effect(() => {
    const date = activeDate.value;
    if (!macroCrossings.isLoaded(date)) return;
    const checks: { name: Macro; el: HTMLDivElement | undefined; next: MacroState }[] = [
      { name: 'kcal', el: kcalEl, next: kcalState(totals.kcal, targets.kcal) },
      { name: 'protein', el: proteinEl, next: nonKcalState(totals.protein, targets.protein) },
      { name: 'carbs', el: carbsEl, next: nonKcalState(totals.carbs, targets.carbs) },
      { name: 'fat', el: fatEl, next: nonKcalState(totals.fat, targets.fat) },
    ];

    for (const c of checks) {
      const prev = macroCrossings.macroState(date, c.name);
      if (c.next === prev) continue;

      const wasFirstCrossing = !macroCrossings.hasAnyCrossing(date);
      void macroCrossings.setMacro(date, c.name, c.next);

      if (!c.el) continue;

      if (prev === 'under' && c.next === 'hit') {
        burstConfetti(c.el);
      } else if (c.name === 'kcal' && c.next === 'over') {
        shakeWarning(c.el);
      }

      if (wasFirstCrossing && c.next !== 'under') {
        const main = document.querySelector<HTMLElement>('main');
        if (main) flashEdge(main);
      }
    }
  });
</script>

<div class="border-border rounded-md border p-4 md:p-5">
  <h3 class="mb-4 text-sm font-semibold">Сьогодні</h3>

  <div class="grid grid-cols-2 gap-3">
    <!-- kcal -->
    <div bind:this={kcalEl} class="bg-accent/10 flex flex-col gap-2 rounded-lg p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Flame size={14} />
        Калорії
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="text-accent text-2xl font-bold tabular-nums">{Math.round(totals.kcal)}</span>
        {#if targets.kcal > 0}
          <span class="text-muted text-sm tabular-nums">/ {targets.kcal}</span>
        {/if}
        <span class="text-muted ml-auto text-xs">ккал</span>
      </div>
      {#if targets.kcal > 0}
        <div class="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full">
          <div
            class="h-full rounded-full {bar(totals.kcal, targets.kcal).over
              ? 'bg-danger'
              : 'bg-accent'}"
            style="width: {bar(totals.kcal, targets.kcal).width}%;"
          ></div>
        </div>
        <div class="text-muted text-xs tabular-nums">{pct(totals.kcal, targets.kcal)}% норми</div>
      {/if}
    </div>

    <!-- protein -->
    <div bind:this={proteinEl} class="bg-danger/10 flex flex-col gap-2 rounded-lg p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Dumbbell size={14} />
        Білок
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="text-danger text-2xl font-bold tabular-nums">{Math.round(totals.protein)}</span
        >
        {#if targets.protein > 0}
          <span class="text-muted text-sm tabular-nums">/ {targets.protein}</span>
        {/if}
        <span class="text-muted ml-auto text-xs">г</span>
      </div>
      {#if targets.protein > 0}
        <div class="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full">
          <div
            class="h-full rounded-full {bar(totals.protein, targets.protein).over
              ? 'bg-danger'
              : 'bg-danger'}"
            style="width: {bar(totals.protein, targets.protein).width}%;"
          ></div>
        </div>
        <div class="text-muted text-xs tabular-nums">
          {pct(totals.protein, targets.protein)}% норми
        </div>
      {/if}
    </div>

    <!-- carbs -->
    <div bind:this={carbsEl} class="bg-warn/10 flex flex-col gap-2 rounded-lg p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Wheat size={14} />
        Вуглеводи
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="text-warn text-2xl font-bold tabular-nums">{Math.round(totals.carbs)}</span>
        {#if targets.carbs > 0}
          <span class="text-muted text-sm tabular-nums">/ {targets.carbs}</span>
        {/if}
        <span class="text-muted ml-auto text-xs">г</span>
      </div>
      {#if targets.carbs > 0}
        <div class="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full">
          <div
            class="h-full rounded-full {bar(totals.carbs, targets.carbs).over
              ? 'bg-danger'
              : 'bg-warn'}"
            style="width: {bar(totals.carbs, targets.carbs).width}%;"
          ></div>
        </div>
        <div class="text-muted text-xs tabular-nums">{pct(totals.carbs, targets.carbs)}% норми</div>
      {/if}
    </div>

    <!-- fat -->
    <div bind:this={fatEl} class="bg-fat/10 flex flex-col gap-2 rounded-lg p-4">
      <div class="text-muted flex items-center gap-2 text-xs">
        <Droplet size={14} />
        Жири
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="text-fat text-2xl font-bold tabular-nums">{Math.round(totals.fat)}</span>
        {#if targets.fat > 0}
          <span class="text-muted text-sm tabular-nums">/ {targets.fat}</span>
        {/if}
        <span class="text-muted ml-auto text-xs">г</span>
      </div>
      {#if targets.fat > 0}
        <div class="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full">
          <div
            class="h-full rounded-full {bar(totals.fat, targets.fat).over ? 'bg-danger' : 'bg-fat'}"
            style="width: {bar(totals.fat, targets.fat).width}%;"
          ></div>
        </div>
        <div class="text-muted text-xs tabular-nums">{pct(totals.fat, targets.fat)}% норми</div>
      {/if}
    </div>
  </div>

  <div class="text-muted mt-4 flex items-center gap-2 text-xs">
    <Utensils size={14} />
    Записів: {dailyLog.entries.length} · Продуктів: {count}
  </div>
</div>

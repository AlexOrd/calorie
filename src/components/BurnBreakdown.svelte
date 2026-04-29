<script lang="ts">
  import { Flame, Footprints, Dumbbell, Heart } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { activity } from '$state/activity.svelte';
  import { bmr, stepKcal, trainingKcal } from '$lib/energy';

  let parts = $derived.by(() => {
    if (!profile.value) return null;
    const p = profile.value;
    const a = activity.value;
    const baseBmr = Math.round(bmr(p));
    const fromSteps = Math.round(stepKcal(a.steps, p.weight));
    const fromTraining = trainingKcal(a.trainings);
    const total = baseBmr + fromSteps + fromTraining;
    if (total <= 0) return null;
    return {
      bmr: baseBmr,
      steps: fromSteps,
      training: fromTraining,
      total,
      bmrPct: (baseBmr / total) * 100,
      stepsPct: (fromSteps / total) * 100,
      trainPct: (fromTraining / total) * 100,
    };
  });

  let stepCount = $derived(activity.value.steps);
  let trainingCount = $derived(activity.value.trainings);

  function fmtNumber(n: number): string {
    return n.toLocaleString('uk-UA');
  }
</script>

{#if parts}
  <div class="border-border bg-surface-2 rounded-xl border p-4">
    <header class="mb-3 flex items-baseline justify-between gap-2">
      <div class="flex items-center gap-2">
        <Flame size={18} class="text-accent" />
        <h3 class="text-fg text-sm font-semibold">Спалено за день</h3>
      </div>
      <div class="text-fg text-xl font-bold tabular-nums">
        {fmtNumber(parts.total)}
        <span class="text-muted text-xs font-normal">ккал</span>
      </div>
    </header>

    <div class="bg-surface flex h-3 w-full overflow-hidden rounded-full">
      <div
        class="bg-muted h-full transition-[width] duration-300"
        style="width: {parts.bmrPct}%;"
        title="Базовий обмін: {parts.bmr} ккал"
      ></div>
      <div
        class="bg-accent h-full transition-[width] duration-300"
        style="width: {parts.stepsPct}%;"
        title="Кроки: +{parts.steps} ккал"
      ></div>
      <div
        class="bg-ok h-full transition-[width] duration-300"
        style="width: {parts.trainPct}%;"
        title="Тренування: +{parts.training} ккал"
      ></div>
    </div>

    <div class="mt-3 flex flex-col gap-2 text-sm">
      <div class="flex items-center gap-2">
        <Heart size={14} class="text-muted shrink-0" />
        <span class="text-fg flex-1">Базовий обмін</span>
        <span class="text-muted text-xs">постійно</span>
        <span class="text-fg w-20 text-right tabular-nums">{fmtNumber(parts.bmr)} ккал</span>
      </div>
      <div class="flex items-center gap-2">
        <Footprints size={14} class="text-accent shrink-0" />
        <span class="text-fg flex-1">Кроки</span>
        <span class="text-muted text-xs tabular-nums">{fmtNumber(stepCount)}</span>
        <span class="text-accent w-20 text-right font-semibold tabular-nums">
          +{fmtNumber(parts.steps)} ккал
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Dumbbell size={14} class="text-ok shrink-0" />
        <span class="text-fg flex-1">Тренування</span>
        <span class="text-muted text-xs tabular-nums">×{trainingCount}</span>
        <span class="text-ok w-20 text-right font-semibold tabular-nums">
          +{fmtNumber(parts.training)} ккал
        </span>
      </div>
    </div>

    <p class="text-muted mt-3 text-xs leading-relaxed">
      Активність збільшує спалені калорії — твій дефіцит зростає, навіть якщо ти їси однаково.
    </p>
  </div>
{/if}

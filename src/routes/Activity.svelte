<script lang="ts">
  import { Footprints, Dumbbell, Droplet, Plus } from '@lucide/svelte';
  import { activity, STEP_TARGET } from '$state/activity.svelte';
  import { profile } from '$state/profile.svelte';
  import { hydrationTarget, HYDRATION_QUICK_ADD_ML } from '$lib/hydration';
  import { hapticImpact } from '$lib/haptics';

  const STEP_QUICK_ADDS = [1000, 3000, 5000] as const;
  const WATER_QUICK_ADDS = [HYDRATION_QUICK_ADD_ML, 500, 1000] as const;

  let steps = $derived(activity.value.steps);
  let stepsPct = $derived(Math.min(150, Math.round((steps / STEP_TARGET) * 100)));
  let stepsBarWidth = $derived(Math.min(100, Math.round((steps / STEP_TARGET) * 100)));
  let stepsOver = $derived(steps > STEP_TARGET);

  let waterMl = $derived(activity.value.waterMl);
  let waterTargetMl = $derived(profile.value ? hydrationTarget(profile.value) : 2000);
  let waterPct = $derived(Math.min(150, Math.round((waterMl / waterTargetMl) * 100)));
  let waterBarWidth = $derived(Math.min(100, Math.round((waterMl / waterTargetMl) * 100)));
  let waterAtLeastTarget = $derived(waterMl >= waterTargetMl);

  let trainings = $derived(activity.value.trainings);
  let trainingKcal = $derived(trainings * 120);

  function onStepsInput(e: Event): void {
    const target = e.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number(target.value);
    if (Number.isFinite(value)) activity.setSteps(value);
  }

  function onWaterInput(e: Event): void {
    const target = e.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number(target.value);
    if (Number.isFinite(value)) activity.setWater(value);
  }

  function quickAddSteps(n: number): void {
    hapticImpact('light');
    activity.setSteps(steps + n);
  }

  function quickAddWater(n: number): void {
    hapticImpact('light');
    activity.addWater(n);
  }

  const SLOTS: readonly [0, 1, 2] = [0, 1, 2] as const;

  function fmtLitres(ml: number): string {
    return (ml / 1000).toFixed(ml % 1000 === 0 ? 1 : 2);
  }

  function fmtMl(ml: number): string {
    return ml >= 1000 ? `${ml / 1000} л` : `${ml} мл`;
  }

  function fmtSteps(n: number): string {
    return n.toLocaleString('uk-UA');
  }
</script>

<section
  class="mx-auto flex max-w-md flex-col gap-4 p-3 md:grid md:max-w-none md:grid-cols-2 md:gap-4 md:p-6"
>
  <h2 class="text-xl font-semibold md:col-span-2">Активність</h2>

  <!-- Steps -->
  <div class="border-border bg-surface-2 flex flex-col gap-3 rounded-xl border p-5">
    <header class="flex items-center justify-between">
      <div class="text-muted flex items-center gap-2 text-sm">
        <Footprints size={18} class="text-accent" />
        <span class="font-semibold">Кроки</span>
      </div>
      <span class="text-accent text-lg font-bold tabular-nums">{stepsPct}%</span>
    </header>

    <div class="flex items-baseline gap-2">
      <input
        type="number"
        min="0"
        step="100"
        value={steps}
        oninput={onStepsInput}
        class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 w-32 rounded-lg border px-3 py-2.5 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
      />
      <span class="text-muted text-sm tabular-nums">/ {fmtSteps(STEP_TARGET)}</span>
    </div>

    <div class="bg-surface h-2 w-full overflow-hidden rounded-full">
      <div
        class={[
          'h-full rounded-full transition-[width] duration-300',
          stepsOver ? 'bg-ok' : 'bg-accent',
        ]}
        style="width: {stepsBarWidth}%;"
      ></div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      {#each STEP_QUICK_ADDS as n (n)}
        <button
          type="button"
          onclick={() => quickAddSteps(n)}
          class="border-border bg-surface text-fg hover:bg-surface-2 inline-flex items-center justify-center gap-1 rounded-lg border py-2 text-sm font-semibold tabular-nums transition-colors"
        >
          <Plus size={14} />
          {fmtSteps(n)}
        </button>
      {/each}
    </div>

    <p class="text-muted text-xs leading-relaxed">
      Норма {fmtSteps(STEP_TARGET)} кроків — рівень "активний спосіб життя" за ВООЗ.
    </p>
  </div>

  <!-- Water -->
  <div class="border-border bg-surface-2 flex flex-col gap-3 rounded-xl border p-5">
    <header class="flex items-center justify-between">
      <div class="text-muted flex items-center gap-2 text-sm">
        <Droplet size={18} class="text-accent" />
        <span class="font-semibold">Вода</span>
      </div>
      <span class="text-accent text-lg font-bold tabular-nums">{waterPct}%</span>
    </header>

    <div class="flex items-baseline gap-2">
      <input
        type="number"
        min="0"
        step="50"
        value={waterMl}
        oninput={onWaterInput}
        class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 w-32 rounded-lg border px-3 py-2.5 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
      />
      <span class="text-muted text-sm tabular-nums">/ {waterTargetMl} мл</span>
    </div>

    <div class="bg-surface h-2 w-full overflow-hidden rounded-full">
      <div
        class={[
          'h-full rounded-full transition-[width] duration-300',
          waterAtLeastTarget ? 'bg-ok' : 'bg-accent',
        ]}
        style="width: {waterBarWidth}%;"
      ></div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      {#each WATER_QUICK_ADDS as n (n)}
        <button
          type="button"
          onclick={() => quickAddWater(n)}
          class="border-border bg-surface text-fg hover:bg-surface-2 inline-flex items-center justify-center gap-1 rounded-lg border py-2 text-sm font-semibold tabular-nums transition-colors"
        >
          <Plus size={14} />
          {fmtMl(n)}
        </button>
      {/each}
    </div>

    <p class="text-muted text-xs leading-relaxed">
      Ціль: 30 мл × вага, мінімум 2.0 л (♀) / 2.5 л (♂). Зараз: {fmtLitres(waterMl)} / {fmtLitres(
        waterTargetMl,
      )} л.
    </p>
  </div>

  <!-- Trainings -->
  <div class="border-border bg-surface-2 flex flex-col gap-3 rounded-xl border p-5 md:col-span-2">
    <header class="flex items-center justify-between">
      <div class="text-muted flex items-center gap-2 text-sm">
        <Dumbbell size={18} class="text-accent" />
        <span class="font-semibold">Тренування</span>
      </div>
      <span class="text-accent text-lg font-bold tabular-nums">
        {#if trainings > 0}+{trainingKcal} ккал{:else}0 ккал{/if}
      </span>
    </header>

    <div class="grid grid-cols-3 gap-3">
      {#each SLOTS as slot (slot)}
        {@const slotNum = slot + 1}
        {@const ticked = trainings >= slotNum}
        <button
          type="button"
          class={[
            'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border transition-colors',
            ticked
              ? 'border-ok bg-ok/10 text-ok'
              : 'border-border bg-surface text-muted hover:bg-surface-2',
          ]}
          aria-pressed={ticked}
          onclick={() => {
            hapticImpact('light');
            activity.tickTraining(slot);
          }}
        >
          <Dumbbell size={20} />
          <span class="text-xs font-semibold tabular-nums">{slotNum}</span>
        </button>
      {/each}
    </div>

    <p class="text-muted text-xs leading-relaxed">
      Натисни — зараховуй кожне легке тренування (~30 хв йоги, мобільності або силового): +120 ккал
      за слот.
    </p>
  </div>
</section>

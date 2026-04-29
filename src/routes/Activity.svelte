<script lang="ts">
  import { Footprints, Dumbbell, Droplet, Plus } from '@lucide/svelte';
  import { activity, STEP_TARGET } from '$state/activity.svelte';
  import { profile } from '$state/profile.svelte';
  import { hydrationTarget, HYDRATION_QUICK_ADD_ML } from '$lib/hydration';
  import { hapticImpact } from '$lib/haptics';

  let steps = $derived(activity.value.steps);
  let stepsPct = $derived(Math.min(150, Math.round((steps / STEP_TARGET) * 100)));
  let stepsBarWidth = $derived(Math.min(100, Math.round((steps / STEP_TARGET) * 100)));
  let stepsOver = $derived(steps > STEP_TARGET);

  let waterMl = $derived(activity.value.waterMl);
  let waterTargetMl = $derived(profile.value ? hydrationTarget(profile.value) : 2000);
  let waterPct = $derived(Math.min(150, Math.round((waterMl / waterTargetMl) * 100)));
  let waterBarWidth = $derived(Math.min(100, Math.round((waterMl / waterTargetMl) * 100)));
  let waterAtLeastTarget = $derived(waterMl >= waterTargetMl);

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

  function quickAddWater(): void {
    hapticImpact('light');
    activity.addWater(HYDRATION_QUICK_ADD_ML);
  }

  const SLOTS: readonly [0, 1, 2] = [0, 1, 2] as const;

  function fmtLitres(ml: number): string {
    return (ml / 1000).toFixed(ml % 1000 === 0 ? 1 : 2);
  }
</script>

<section
  class="mx-auto flex max-w-md flex-col gap-4 p-3 md:grid md:max-w-none md:grid-cols-2 md:gap-4 md:p-6"
>
  <h2 class="text-xl font-semibold md:col-span-2">Активність</h2>

  <!-- Steps card -->
  <div class="border-border bg-surface-2 rounded-xl border p-5">
    <div class="text-muted mb-3 flex items-center gap-2 text-sm">
      <Footprints size={18} />
      Кроки
    </div>

    <div class="flex items-baseline gap-3">
      <input
        type="number"
        min="0"
        step="100"
        value={steps}
        oninput={onStepsInput}
        class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 w-32 rounded-lg border px-4 py-3 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
      />
      <span class="text-muted text-base">/ {STEP_TARGET}</span>
      <span class="text-accent ml-auto text-2xl font-bold tabular-nums">{stepsPct}%</span>
    </div>

    <div class="bg-surface-2 mt-4 h-3 w-full overflow-hidden rounded-full">
      <div
        class={[
          'h-full rounded-full transition-[width] duration-300',
          stepsOver ? 'bg-ok' : 'bg-accent',
        ]}
        style="width: {stepsBarWidth}%;"
      ></div>
    </div>

    <p class="text-muted mt-3 text-xs">
      Норма {STEP_TARGET} кроків на день — рівень "активний спосіб життя" за рекомендаціями ВООЗ.
    </p>
  </div>

  <!-- Water card -->
  <div class="border-border bg-surface-2 rounded-xl border p-5">
    <div class="text-muted mb-3 flex items-center gap-2 text-sm">
      <Droplet size={18} />
      Вода
    </div>

    <div class="flex items-baseline gap-3">
      <input
        type="number"
        min="0"
        step="50"
        value={waterMl}
        oninput={onWaterInput}
        class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 w-32 rounded-lg border px-4 py-3 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
      />
      <span class="text-muted text-base">/ {waterTargetMl} мл</span>
      <span class="text-accent ml-auto text-2xl font-bold tabular-nums">{waterPct}%</span>
    </div>

    <div class="bg-surface-2 mt-4 h-3 w-full overflow-hidden rounded-full">
      <div
        class={[
          'h-full rounded-full transition-[width] duration-300',
          waterAtLeastTarget ? 'bg-ok' : 'bg-accent',
        ]}
        style="width: {waterBarWidth}%;"
      ></div>
    </div>

    <button
      type="button"
      onclick={quickAddWater}
      class="border-border bg-surface text-fg hover:bg-surface-2 mt-3 inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
    >
      <Plus size={16} />
      +{HYDRATION_QUICK_ADD_ML} мл
    </button>

    <p class="text-muted mt-3 text-xs">
      Ціль: 30 мл × вага, мінімум 2.0 / 2.5 л. Зараз: {fmtLitres(waterMl)} / {fmtLitres(
        waterTargetMl,
      )} л.
    </p>
  </div>

  <!-- Trainings (3 light sessions) -->
  <div class="border-border bg-surface-2 rounded-xl border p-5 md:col-span-2">
    <div class="text-muted mb-3 flex items-center gap-2 text-sm">
      <Dumbbell size={18} />
      Тренування
    </div>
    <div class="grid grid-cols-3 gap-3">
      {#each SLOTS as slot (slot)}
        {@const slotNum = slot + 1}
        {@const ticked = activity.value.trainings >= slotNum}
        <button
          type="button"
          class={[
            'flex min-h-16 flex-col items-center justify-center rounded-lg border transition-colors',
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
          <span class="mt-1 text-xs font-semibold tabular-nums">{slotNum}</span>
        </button>
      {/each}
    </div>
    {#if activity.value.trainings > 0}
      <p class="text-muted mt-3 text-xs">+{activity.value.trainings * 120} ккал сьогодні</p>
    {/if}
  </div>
</section>

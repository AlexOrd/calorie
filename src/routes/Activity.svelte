<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Check, Dumbbell, Droplet, Footprints, Plus, Scale } from '@lucide/svelte';
  import { activity, STEP_TARGET } from '$state/activity.svelte';
  import { weightLog } from '$state/weightLog.svelte';
  import { profile } from '$state/profile.svelte';
  import { hydrationTarget, HYDRATION_QUICK_ADD_ML } from '$lib/hydration';
  import { hapticImpact } from '$lib/haptics';
  import { clearZeroOnFocus } from '$lib/input';
  import type { ProfileInput, UserProfile } from '$types/profile';

  const STEP_QUICK_ADDS = [1000, 3000, 5000] as const;
  const WATER_QUICK_ADDS = [HYDRATION_QUICK_ADD_ML, 500, 1000] as const;
  const MIN_WEIGHT_KG = 30;
  const MAX_WEIGHT_KG = 250;
  const WEIGHT_SLIDER_SPREAD = 15;
  const WEIGHT_SAVED_MSG_MS = 2200;

  let steps = $derived(activity.value.steps);
  let stepsPct = $derived(Math.min(150, Math.round((steps / STEP_TARGET) * 100)));

  let waterMl = $derived(activity.value.waterMl);
  let waterTargetMl = $derived(profile.value ? hydrationTarget(profile.value) : 2000);
  let waterPct = $derived(Math.min(150, Math.round((waterMl / waterTargetMl) * 100)));

  let trainings = $derived(activity.value.trainings);
  let trainingKcal = $derived(trainings * 120);
  let todayWeight = $derived(weightLog.today);
  let weightReady = $derived(todayWeight ?? profile.value?.weight ?? 74);

  let draftWeightKg = $derived(clampWeight(weightReady));
  let sliderMin = $derived(Math.max(MIN_WEIGHT_KG, Math.round(weightReady) - WEIGHT_SLIDER_SPREAD));
  let sliderMax = $derived(Math.min(MAX_WEIGHT_KG, Math.round(weightReady) + WEIGHT_SLIDER_SPREAD));
  let canSaveWeight = $derived(
    todayWeight === null || Math.abs(draftWeightKg - todayWeight) > 0.05,
  );
  let weightSliderPct = $derived(
    sliderMax === sliderMin
      ? 50
      : Math.max(0, Math.min(100, ((draftWeightKg - sliderMin) / (sliderMax - sliderMin)) * 100)),
  );
  let weightSavedNotice = $state(false);
  let saveNoticeTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  onDestroy(() => {
    if (saveNoticeTimer !== null) clearTimeout(saveNoticeTimer);
  });

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

  function onWeightInput(e: Event): void {
    const target = e.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number(target.value);
    if (Number.isFinite(value)) draftWeightKg = clampWeight(value);
  }

  function quickAddSteps(n: number): void {
    hapticImpact('light');
    activity.setSteps(steps + n);
  }

  function quickAddWater(n: number): void {
    hapticImpact('light');
    activity.addWater(n);
  }

  async function saveWeight(): Promise<void> {
    const nextWeight = clampWeight(draftWeightKg);
    if (!canSaveWeight) return;
    hapticImpact('light');
    await weightLog.setToday(nextWeight);

    if (saveNoticeTimer !== null) clearTimeout(saveNoticeTimer);
    weightSavedNotice = true;
    saveNoticeTimer = setTimeout(() => {
      weightSavedNotice = false;
      saveNoticeTimer = null;
    }, WEIGHT_SAVED_MSG_MS);

    const current = profile.value;
    if (!current) return;
    await profile.save(toProfileInput({ ...current, weight: nextWeight }));
  }

  function bumpWeight(delta: number): void {
    hapticImpact('light');
    draftWeightKg = clampWeight(draftWeightKg + delta);
  }

  const SLOTS: readonly [0, 1, 2] = [0, 1, 2] as const;

  function fmtLitres(ml: number): string {
    return (ml / 1000).toFixed(ml % 1000 === 0 ? 1 : 2);
  }

  function fmtMl(ml: number): string {
    return ml >= 1000 ? `${ml / 1000} л` : `${ml} мл`;
  }

  function fmtWeight(kg: number): string {
    return `${kg.toFixed(1)} кг`;
  }

  function fmtSteps(n: number): string {
    return n.toLocaleString('uk-UA');
  }

  function clampWeight(value: number): number {
    const safe = Math.max(MIN_WEIGHT_KG, Math.min(MAX_WEIGHT_KG, value));
    return Math.round(safe * 10) / 10;
  }

  function toProfileInput(current: UserProfile): ProfileInput {
    return {
      height: current.height,
      weight: current.weight,
      gender: current.gender,
      age: current.age,
      activity: current.activity,
      ...(current.target_weight_kg !== undefined
        ? { target_weight_kg: current.target_weight_kg }
        : {}),
      ...(current.waist_cm !== undefined ? { waist_cm: current.waist_cm } : {}),
      ...(current.neck_cm !== undefined ? { neck_cm: current.neck_cm } : {}),
      ...(current.hip_cm !== undefined ? { hip_cm: current.hip_cm } : {}),
    };
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

    <div class="flex items-center gap-3">
      <input
        type="number"
        min="0"
        step="100"
        value={steps}
        oninput={onStepsInput}
        onfocus={clearZeroOnFocus}
        class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
      />
      <span class="text-muted shrink-0 text-sm tabular-nums">/ {fmtSteps(STEP_TARGET)}</span>
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

    <div class="flex items-center gap-3">
      <input
        type="number"
        min="0"
        step="50"
        value={waterMl}
        oninput={onWaterInput}
        onfocus={clearZeroOnFocus}
        class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
      />
      <span class="text-muted shrink-0 text-sm tabular-nums">/ {waterTargetMl} мл</span>
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

  <!-- Weight -->
  <div class="border-border bg-surface-2 flex flex-col gap-3 rounded-xl border p-5 md:col-span-2">
    <header class="flex items-center justify-between">
      <div class="text-muted flex items-center gap-2 text-sm">
        <Scale size={18} class="text-accent" />
        <span class="font-semibold">Вага сьогодні</span>
      </div>
      <span class="text-accent text-lg font-bold tabular-nums">
        {fmtWeight(clampWeight(draftWeightKg))}
      </span>
    </header>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="border-border bg-surface text-fg hover:bg-surface-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-lg font-semibold"
        onclick={() => bumpWeight(-0.1)}
        aria-label="Зменшити вагу на 100 грамів"
      >
        −
      </button>

      <input
        type="number"
        min={MIN_WEIGHT_KG}
        max={MAX_WEIGHT_KG}
        step="0.1"
        value={draftWeightKg}
        oninput={onWeightInput}
        onfocus={clearZeroOnFocus}
        class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2.5 text-2xl font-bold tabular-nums focus:ring-2 focus:outline-none"
      />

      <button
        type="button"
        class="border-border bg-surface text-fg hover:bg-surface-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-lg font-semibold"
        onclick={() => bumpWeight(0.1)}
        aria-label="Збільшити вагу на 100 грамів"
      >
        +
      </button>

      <button
        type="button"
        disabled={!canSaveWeight}
        onclick={() => void saveWeight()}
        class="bg-accent text-on-accent inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Зберегти вагу"
      >
        <Check size={16} />
      </button>
    </div>

    <input
      type="range"
      min={sliderMin}
      max={sliderMax}
      step="0.1"
      bind:value={draftWeightKg}
      class="[&::-moz-range-thumb]:bg-accent [&::-webkit-slider-thumb]:bg-accent h-1 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
      style="background: linear-gradient(to right, var(--color-accent) {weightSliderPct.toFixed(
        1,
      )}%, var(--color-border) {weightSliderPct.toFixed(1)}%);"
      aria-label="Повзунок ваги"
    />

    <p class="text-muted text-xs leading-relaxed">
      Зважуйся у будь-якому ритмі: щодня, раз на кілька днів або раз на тиждень. Запис зберігається
      один раз на день (нове збереження в цей самий день оновлює значення). Останній запис:
      {todayWeight === null ? 'ще немає' : fmtWeight(todayWeight)}. Після збереження вага профілю
      синхронізується автоматично.
    </p>
    {#if weightSavedNotice}
      <p class="text-ok text-xs font-medium">Вагу збережено за сьогодні.</p>
    {/if}
  </div>
</section>

<script lang="ts">
  import { Footprints, Dumbbell, Check } from '@lucide/svelte';
  import { activity, STEP_TARGET } from '$state/activity.svelte';

  let steps = $derived(activity.value.steps);
  let stepsPct = $derived(Math.min(150, Math.round((steps / STEP_TARGET) * 100)));
  let stepsBarWidth = $derived(Math.min(100, Math.round((steps / STEP_TARGET) * 100)));
  let stepsOver = $derived(steps > STEP_TARGET);

  function onStepsInput(e: Event): void {
    const target = e.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number(target.value);
    if (Number.isFinite(value)) activity.setSteps(value);
  }
</script>

<section class="mx-auto flex max-w-md flex-col gap-4 p-3 md:p-6">
  <h2 class="text-xl font-semibold">Активність</h2>

  <!-- Steps card -->
  <div class="rounded-xl border border-white/10 bg-white/2 p-5">
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
        class="text-fg w-32 rounded-lg border border-white/10 bg-transparent px-4 py-3 text-2xl font-bold tabular-nums"
      />
      <span class="text-muted text-base">/ {STEP_TARGET}</span>
      <span class="text-accent ml-auto text-2xl font-bold tabular-nums">{stepsPct}%</span>
    </div>

    <div class="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
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

  <!-- Strength training toggle -->
  <button
    type="button"
    class={[
      'flex min-h-16 items-center gap-4 rounded-xl border px-5 py-4 text-left transition-colors',
      activity.value.strength
        ? 'border-ok bg-ok/10'
        : 'border-white/10 bg-white/2 hover:bg-white/5',
    ]}
    onclick={() => activity.toggleStrength()}
    aria-pressed={activity.value.strength}
  >
    <div
      class={[
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
        activity.value.strength ? 'bg-ok text-white' : 'text-muted bg-white/5',
      ]}
    >
      {#if activity.value.strength}
        <Check size={24} />
      {:else}
        <Dumbbell size={24} />
      {/if}
    </div>
    <div class="flex flex-col">
      <span class="text-base font-semibold">Силове тренування</span>
      <span class="text-muted text-sm">
        {activity.value.strength ? 'Виконано сьогодні' : 'Не виконано'}
      </span>
    </div>
  </button>
</section>

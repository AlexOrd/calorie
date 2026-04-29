<script lang="ts">
  import { Footprints, Dumbbell } from '@lucide/svelte';
  import { activity, STEP_TARGET } from '$state/activity.svelte';
  import { hapticImpact } from '$lib/haptics';

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

  const SLOTS: readonly [0, 1, 2] = [0, 1, 2] as const;
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

  <!-- Trainings (3 light sessions) -->
  <div class="border-border bg-surface-2 rounded-xl border p-5 md:col-start-2 md:row-start-2">
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

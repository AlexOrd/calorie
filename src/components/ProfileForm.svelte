<script lang="ts">
  import { untrack } from 'svelte';
  import type { ProfileInput, ActivityLevel } from '$types/profile';

  interface Props {
    initial?: ProfileInput | null;
    submitLabel: string;
    dirtyLabel?: string;
    onSubmit: (input: ProfileInput) => Promise<void> | void;
  }
  let { initial = null, submitLabel, dirtyLabel, onSubmit }: Props = $props();

  // Seed the form from `initial` once on mount; subsequent prop updates
  // shouldn't clobber the user's in-progress edits. untrack() makes that
  // intent explicit and silences svelte/valid-compile.
  let height = $state(untrack(() => initial?.height ?? 168));
  let weight = $state(untrack(() => initial?.weight ?? 74));
  let age = $state(untrack(() => initial?.age ?? 30));
  let gender = $state<'male' | 'female'>(untrack(() => initial?.gender ?? 'female'));
  let activity = $state<ActivityLevel>(untrack(() => initial?.activity ?? 1.2));

  const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
    { value: 1.2, label: 'Сидячий' },
    { value: 1.375, label: 'Легка активність' },
    { value: 1.55, label: 'Помірна активність' },
    { value: 1.725, label: 'Висока активність' },
  ];

  let valid = $derived(
    height >= 120 && height <= 230 && weight >= 30 && weight <= 250 && age >= 12 && age <= 100,
  );

  const initialSnapshot = {
    height: untrack(() => initial?.height ?? 168),
    weight: untrack(() => initial?.weight ?? 74),
    age: untrack(() => initial?.age ?? 30),
    gender: untrack(() => initial?.gender ?? 'female'),
    activity: untrack(() => initial?.activity ?? 1.2),
  };
  let snapshot = $state({ ...initialSnapshot });

  let isDirty = $derived(
    height !== snapshot.height ||
      weight !== snapshot.weight ||
      age !== snapshot.age ||
      gender !== snapshot.gender ||
      activity !== snapshot.activity,
  );

  // Onboarding (no `initial`) treats every submission as dirty.
  let canSubmit = $derived(valid && (initial === null || isDirty));

  let saving = $state(false);

  async function submit(): Promise<void> {
    if (!canSubmit || saving) return;
    saving = true;
    try {
      await onSubmit({ height, weight, gender, age, activity });
      snapshot = { height, weight, age, gender, activity };
    } finally {
      saving = false;
    }
  }
</script>

<form
  class="flex flex-col gap-5"
  onsubmit={(e) => {
    e.preventDefault();
    void submit();
  }}
>
  <label class="text-muted flex flex-col gap-2 text-sm">
    Зріст, см
    <input
      type="number"
      inputmode="numeric"
      enterkeyhint="next"
      autocomplete="off"
      class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 rounded-lg border px-4 py-4 text-lg focus:ring-2 focus:outline-none"
      min="120"
      max="230"
      bind:value={height}
    />
  </label>

  <label class="text-muted flex flex-col gap-2 text-sm">
    Вага, кг
    <input
      type="number"
      inputmode="decimal"
      enterkeyhint="next"
      autocomplete="off"
      class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 rounded-lg border px-4 py-4 text-lg focus:ring-2 focus:outline-none"
      min="30"
      max="250"
      step="0.1"
      bind:value={weight}
    />
  </label>

  <label class="text-muted flex flex-col gap-2 text-sm">
    Вік
    <input
      type="number"
      inputmode="numeric"
      enterkeyhint="done"
      autocomplete="off"
      class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 rounded-lg border px-4 py-4 text-lg focus:ring-2 focus:outline-none"
      min="12"
      max="100"
      bind:value={age}
    />
  </label>

  <fieldset class="flex flex-col gap-2.5 text-sm">
    <legend class="text-muted">Стать</legend>
    <div class="flex gap-2">
      <label
        class={[
          'border-border bg-surface flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border px-4 py-4 text-lg transition-colors',
          gender === 'female' && 'bg-accent border-accent text-on-accent',
        ]}
      >
        <input type="radio" class="sr-only" bind:group={gender} value="female" /> Жін
      </label>
      <label
        class={[
          'border-border bg-surface flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border px-4 py-4 text-lg transition-colors',
          gender === 'male' && 'bg-accent border-accent text-on-accent',
        ]}
      >
        <input type="radio" class="sr-only" bind:group={gender} value="male" /> Чол
      </label>
    </div>
  </fieldset>

  <fieldset class="flex flex-col gap-2.5 text-sm">
    <legend class="text-muted">Рівень активності</legend>
    <div class="grid grid-cols-2 gap-2">
      {#each ACTIVITY_OPTIONS as opt (opt.value)}
        <label
          class={[
            'border-border bg-surface flex min-h-14 cursor-pointer items-center justify-center rounded-lg border px-3 py-4 text-center text-base transition-colors',
            activity === opt.value && 'bg-accent border-accent text-on-accent',
          ]}
        >
          <input type="radio" class="sr-only" bind:group={activity} value={opt.value} />
          {opt.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <button
    type="submit"
    class="bg-accent text-on-accent mt-4 min-h-14 rounded-lg px-6 py-4 text-lg font-semibold shadow-md shadow-black/20 transition-opacity disabled:opacity-50"
    disabled={!canSubmit || saving}
  >
    {#if saving}
      …
    {:else if initial !== null && isDirty && dirtyLabel}
      {dirtyLabel}
    {:else}
      {submitLabel}
    {/if}
  </button>
</form>

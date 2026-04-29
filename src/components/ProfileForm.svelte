<script lang="ts">
  import { untrack } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import type { ProfileInput, ActivityLevel } from '$types/profile';

  interface Props {
    initial?: ProfileInput | null;
    submitLabel: string;
    dirtyLabel?: string;
    onSubmit: (input: ProfileInput) => Promise<void> | void;
  }
  let { initial = null, submitLabel, dirtyLabel, onSubmit }: Props = $props();

  let height = $state(untrack(() => initial?.height ?? 168));
  let weight = $state(untrack(() => initial?.weight ?? 74));
  let age = $state(untrack(() => initial?.age ?? 30));
  let gender = $state<'male' | 'female'>(untrack(() => initial?.gender ?? 'female'));
  let activity = $state<ActivityLevel>(untrack(() => initial?.activity ?? 1.2));

  let targetWeight = $state<number | undefined>(untrack(() => initial?.target_weight_kg));
  let waist = $state<number | undefined>(untrack(() => initial?.waist_cm));
  let neck = $state<number | undefined>(untrack(() => initial?.neck_cm));
  let hip = $state<number | undefined>(untrack(() => initial?.hip_cm));
  let advancedOpen = $state(false);

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
    targetWeight: untrack(() => initial?.target_weight_kg),
    waist: untrack(() => initial?.waist_cm),
    neck: untrack(() => initial?.neck_cm),
    hip: untrack(() => initial?.hip_cm),
  };
  let snapshot = $state({ ...initialSnapshot });

  let isDirty = $derived(
    height !== snapshot.height ||
      weight !== snapshot.weight ||
      age !== snapshot.age ||
      gender !== snapshot.gender ||
      activity !== snapshot.activity ||
      targetWeight !== snapshot.targetWeight ||
      waist !== snapshot.waist ||
      neck !== snapshot.neck ||
      hip !== snapshot.hip,
  );

  let canSubmit = $derived(valid && (initial === null || isDirty));

  let saving = $state(false);

  function trim(value: number | undefined): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value;
  }

  async function submit(): Promise<void> {
    if (!canSubmit || saving) return;
    saving = true;
    try {
      const trimmedTarget = trim(targetWeight);
      const trimmedWaist = trim(waist);
      const trimmedNeck = trim(neck);
      const trimmedHip = gender === 'female' ? trim(hip) : undefined;
      await onSubmit({
        height,
        weight,
        gender,
        age,
        activity,
        ...(trimmedTarget !== undefined ? { target_weight_kg: trimmedTarget } : {}),
        ...(trimmedWaist !== undefined ? { waist_cm: trimmedWaist } : {}),
        ...(trimmedNeck !== undefined ? { neck_cm: trimmedNeck } : {}),
        ...(trimmedHip !== undefined ? { hip_cm: trimmedHip } : {}),
      });
      snapshot = { height, weight, age, gender, activity, targetWeight, waist, neck, hip };
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
    Цільова вага, кг (необов'язково)
    <input
      type="number"
      inputmode="decimal"
      enterkeyhint="next"
      autocomplete="off"
      class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 rounded-lg border px-4 py-4 text-lg focus:ring-2 focus:outline-none"
      min="30"
      max="250"
      step="0.1"
      bind:value={targetWeight}
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
          'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border px-4 py-4 text-lg transition-colors',
          gender === 'female'
            ? 'bg-accent border-accent text-on-accent'
            : 'border-border bg-surface',
        ]}
      >
        <input type="radio" class="sr-only" bind:group={gender} value="female" /> Жін
      </label>
      <label
        class={[
          'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border px-4 py-4 text-lg transition-colors',
          gender === 'male' ? 'bg-accent border-accent text-on-accent' : 'border-border bg-surface',
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
            'flex min-h-14 cursor-pointer items-center justify-center rounded-lg border px-3 py-4 text-center text-base transition-colors',
            activity === opt.value
              ? 'bg-accent border-accent text-on-accent'
              : 'border-border bg-surface',
          ]}
        >
          <input type="radio" class="sr-only" bind:group={activity} value={opt.value} />
          {opt.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <details class="border-border bg-surface group rounded-lg border" bind:open={advancedOpen}>
    <summary
      class="text-muted hover:text-fg flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold tracking-wide uppercase select-none"
    >
      <ChevronDown size={14} class="transition-transform group-open:rotate-180" />
      Антропометрія
    </summary>
    <div class="flex flex-col gap-4 px-4 pb-4 text-sm">
      <p class="text-muted text-xs">
        Заповни талію, шию (та стегна, якщо стать ♀), щоб побачити % жиру за US Navy.
      </p>
      <label class="text-muted flex flex-col gap-1.5">
        Талія, см
        <input
          type="number"
          inputmode="decimal"
          autocomplete="off"
          class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none"
          min="40"
          max="200"
          step="0.5"
          bind:value={waist}
        />
      </label>
      <label class="text-muted flex flex-col gap-1.5">
        Шия, см
        <input
          type="number"
          inputmode="decimal"
          autocomplete="off"
          class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none"
          min="20"
          max="80"
          step="0.5"
          bind:value={neck}
        />
      </label>
      {#if gender === 'female'}
        <label class="text-muted flex flex-col gap-1.5">
          Стегна, см
          <input
            type="number"
            inputmode="decimal"
            autocomplete="off"
            class="text-fg border-border bg-surface focus:border-accent focus:ring-accent/20 rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none"
            min="60"
            max="200"
            step="0.5"
            bind:value={hip}
          />
        </label>
      {/if}
    </div>
  </details>

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

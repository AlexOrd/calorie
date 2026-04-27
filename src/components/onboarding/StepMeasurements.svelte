<script lang="ts">
  import type { ProfileInput, ActivityLevel } from '$types/profile';

  let { onSubmit } = $props<{ onSubmit: (input: ProfileInput) => void }>();

  let height = $state(168);
  let weight = $state(74);
  let age = $state(30);
  let gender = $state<'male' | 'female'>('female');
  let activity = $state<ActivityLevel>(1.2);

  const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
    { value: 1.2, label: 'Сидячий' },
    { value: 1.375, label: 'Легка активність' },
    { value: 1.55, label: 'Помірна активність' },
    { value: 1.725, label: 'Висока активність' },
  ];

  let valid = $derived(
    height >= 120 && height <= 230 && weight >= 30 && weight <= 250 && age >= 12 && age <= 100,
  );

  function submit(): void {
    if (!valid) return;
    onSubmit({ height, weight, gender, age, activity });
  }
</script>

<form
  class="flex flex-col gap-5"
  onsubmit={(e) => {
    e.preventDefault();
    submit();
  }}
>
  <h2 class="text-xl font-semibold">Параметри</h2>

  <label class="flex flex-col gap-1 text-sm">
    Зріст, см
    <input
      type="number"
      class="rounded-md border border-white/10 bg-transparent px-3 py-2"
      min="120"
      max="230"
      bind:value={height}
    />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Вага, кг
    <input
      type="number"
      class="rounded-md border border-white/10 bg-transparent px-3 py-2"
      min="30"
      max="250"
      step="0.1"
      bind:value={weight}
    />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Вік
    <input
      type="number"
      class="rounded-md border border-white/10 bg-transparent px-3 py-2"
      min="12"
      max="100"
      bind:value={age}
    />
  </label>

  <fieldset class="flex flex-col gap-2 text-sm">
    <legend>Стать</legend>
    <div class="flex gap-2">
      <label
        class={[
          'flex flex-1 items-center justify-center rounded-md border border-white/10 px-3 py-2',
          gender === 'female' && 'bg-accent text-white',
        ]}
      >
        <input type="radio" class="sr-only" bind:group={gender} value="female" /> Жін
      </label>
      <label
        class={[
          'flex flex-1 items-center justify-center rounded-md border border-white/10 px-3 py-2',
          gender === 'male' && 'bg-accent text-white',
        ]}
      >
        <input type="radio" class="sr-only" bind:group={gender} value="male" /> Чол
      </label>
    </div>
  </fieldset>

  <fieldset class="flex flex-col gap-2 text-sm">
    <legend>Рівень активності</legend>
    <div class="grid grid-cols-2 gap-2">
      {#each ACTIVITY_OPTIONS as opt (opt.value)}
        <label
          class={[
            'flex items-center justify-center rounded-md border border-white/10 px-3 py-2 text-center',
            activity === opt.value && 'bg-accent text-white',
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
    class="bg-accent mt-4 rounded-md px-4 py-2 text-white disabled:opacity-50"
    disabled={!valid}
  >
    Продовжити
  </button>
</form>

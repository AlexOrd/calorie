<script lang="ts">
  import { profile } from '$state/profile.svelte';
  import ProfileForm from '../components/ProfileForm.svelte';
  import TelegramUserHeader from '../components/TelegramUserHeader.svelte';
  import { celebrate } from '$lib/anim';
  import { dailyTargets } from '$lib/scaling';
  import type { ProfileInput } from '$types/profile';

  let targetsEl = $state<HTMLDivElement | undefined>(undefined);
  let savedAt = $state<number | null>(null);

  async function save(input: ProfileInput): Promise<void> {
    await profile.save(input);
    savedAt = Date.now();
    if (targetsEl) celebrate(targetsEl);
  }

  let savedRecently = $derived(savedAt !== null);

  $effect(() => {
    if (savedAt === null) return;
    const id = setTimeout(() => {
      savedAt = null;
    }, 2500);
    return () => clearTimeout(id);
  });
  let targets = $derived(profile.value ? dailyTargets(profile.value) : null);
</script>

<section class="mx-auto max-w-md p-3 md:grid md:max-w-5xl md:grid-cols-2 md:gap-6 md:p-6">
  <div class="md:sticky md:top-4 md:flex md:flex-col md:gap-5 md:self-start">
    <TelegramUserHeader />

    <div class="mb-5 flex items-baseline justify-between md:mb-0">
      <h2 class="text-xl font-semibold">Профіль</h2>
      {#if profile.value}
        <span class="text-muted text-sm tabular-nums">k = {profile.value.k_factor.toFixed(2)}</span>
      {/if}
    </div>

    {#if targets}
      <div
        bind:this={targetsEl}
        class="border-border bg-surface mb-5 grid grid-cols-4 gap-2 rounded-lg border p-3 text-center md:mb-0"
      >
        <div>
          <div class="text-accent text-lg font-semibold tabular-nums">{targets.kcal}</div>
          <div class="text-muted text-[11px]">ккал</div>
        </div>
        <div>
          <div class="text-fg text-lg font-semibold tabular-nums">{targets.protein}</div>
          <div class="text-muted text-[11px]">білок, г</div>
        </div>
        <div>
          <div class="text-fg text-lg font-semibold tabular-nums">{targets.carbs}</div>
          <div class="text-muted text-[11px]">вугл., г</div>
        </div>
        <div>
          <div class="text-fg text-lg font-semibold tabular-nums">{targets.fat}</div>
          <div class="text-muted text-[11px]">жири, г</div>
        </div>
      </div>
    {/if}

    <p class="text-muted mb-4 text-sm md:mb-0">
      Зміна параметрів перерахує норми для всіх майбутніх днів. Існуючі записи журналу не
      змінюються.
    </p>
  </div>

  <div class="md:flex md:flex-col">
    <ProfileForm
      initial={profile.value}
      submitLabel="Зберегти"
      dirtyLabel="Зберегти зміни"
      onSubmit={save}
    />

    {#if savedRecently}
      <p class="text-ok mt-3 text-center text-sm">Цілі оновлено за новим профілем</p>
    {/if}
  </div>
</section>

<script lang="ts">
  import { profile } from '$state/profile.svelte';
  import ProfileForm from '../components/ProfileForm.svelte';
  import { pulseSuccess } from '$lib/anim';
  import type { ProfileInput } from '$types/profile';

  let formEl = $state<HTMLDivElement | undefined>(undefined);
  let savedAt = $state<number | null>(null);

  async function save(input: ProfileInput): Promise<void> {
    await profile.save(input);
    savedAt = Date.now();
    if (formEl) pulseSuccess(formEl);
  }

  let savedRecently = $derived(savedAt !== null && Date.now() - savedAt < 3000);
</script>

<section class="mx-auto max-w-md p-3 md:p-6">
  <div class="mb-5 flex items-baseline justify-between">
    <h2 class="text-xl font-semibold">Профіль</h2>
    {#if profile.value}
      <span class="text-muted text-sm tabular-nums">k = {profile.value.k_factor.toFixed(2)}</span>
    {/if}
  </div>

  <p class="text-muted mb-4 text-sm">
    Зміна параметрів перерахує норми для всіх майбутніх днів. Існуючі записи журналу не змінюються.
  </p>

  <div bind:this={formEl}>
    <ProfileForm initial={profile.value} submitLabel="Зберегти" onSubmit={save} />
  </div>

  {#if savedRecently}
    <p class="text-ok mt-3 text-center text-sm">Збережено</p>
  {/if}
</section>

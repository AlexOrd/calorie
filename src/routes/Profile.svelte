<script lang="ts">
  import { Fingerprint, Plus, Sparkles } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { changelogState } from '$state/changelog.svelte';
  import { weightLog } from '$state/weightLog.svelte';
  import ProfileForm from '../components/ProfileForm.svelte';
  import TelegramUserHeader from '../components/TelegramUserHeader.svelte';
  import ChangelogModal from '../components/ChangelogModal.svelte';
  import ProjectionCard from '../components/ProjectionCard.svelte';
  import { celebrate } from '$lib/anim';
  import { hapticImpact, hapticSelection } from '$lib/haptics';
  import { dailyTargets } from '$lib/scaling';
  import { biometricSupport, enrol, clearEnrolment } from '$lib/biometric';
  import type { ProfileInput } from '$types/profile';

  let targetsEl = $state<HTMLDivElement | undefined>(undefined);
  let savedAt = $state<number | null>(null);
  let changelogOpen = $state(false);
  let bioSupported = $state(false);
  let bioPending = $state(false);

  async function refreshBioSupport(): Promise<void> {
    const s = await biometricSupport();
    bioSupported = s !== 'unsupported';
  }

  async function toggleBio(): Promise<void> {
    if (!profile.value || bioPending) return;
    bioPending = true;
    try {
      if (profile.value.biometric_lock) {
        await profile.setBiometricLock(false);
        await clearEnrolment();
      } else {
        const ok = await enrol();
        if (ok) await profile.setBiometricLock(true);
      }
    } finally {
      bioPending = false;
    }
  }

  void refreshBioSupport();

  async function save(input: ProfileInput): Promise<void> {
    await profile.save(input);
    await weightLog.setToday(input.weight);
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

  async function openChangelog(): Promise<void> {
    hapticSelection();
    changelogOpen = true;
    await changelogState.markSeen();
  }

  let showActionsCard = $derived(profile.value !== null);
</script>

<section
  class="mx-auto flex max-w-md flex-col gap-4 p-3 md:grid md:max-w-5xl md:grid-cols-2 md:gap-6 md:p-6"
>
  <div class="flex flex-col gap-4 md:sticky md:top-4 md:gap-5 md:self-start">
    <div class="flex items-center justify-between">
      <TelegramUserHeader />
      <button
        type="button"
        aria-label="Журнал змін"
        class="text-muted hover:text-fg relative ml-2 rounded-md p-2 transition-colors"
        onclick={openChangelog}
      >
        <Sparkles size={20} />
        {#if changelogState.hasUnseenChanges}
          <span
            class="bg-accent absolute top-1 right-1 inline-block h-2 w-2 rounded-full"
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    </div>

    <div class="flex items-baseline justify-between">
      <h2 class="text-xl font-semibold">Профіль</h2>
    </div>

    {#if targets}
      <div
        bind:this={targetsEl}
        class="border-border bg-surface flex flex-col gap-2 rounded-lg border p-3"
      >
        <div class="flex items-baseline justify-between">
          <h3 class="text-fg text-sm font-semibold">Денні цілі</h3>
          {#if profile.value}
            <span class="text-muted text-xs tabular-nums"
              >k = {profile.value.k_factor.toFixed(2)}</span
            >
          {/if}
        </div>
        <div class="grid grid-cols-4 gap-2 text-center">
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
      </div>
    {/if}

    {#if showActionsCard}
      <div
        class="border-border bg-surface-2 divide-border flex flex-col divide-y rounded-xl border"
      >
        {#if profile.value}
          <button
            type="button"
            class="text-fg hover:bg-surface flex w-full items-center gap-2 px-3 py-3 text-sm font-semibold transition-colors"
            onclick={() => {
              hapticImpact('light');
              if (profile.value) void weightLog.setToday(profile.value.weight);
            }}
          >
            <Plus size={14} class="shrink-0" />
            <span>Зафіксувати вагу сьогодні</span>
            {#if weightLog.today !== null}
              <span class="text-muted ml-auto text-xs tabular-nums"
                >{weightLog.today.toFixed(1)} кг</span
              >
            {/if}
          </button>
        {/if}

        {#if bioSupported && profile.value}
          <button
            type="button"
            class={[
              'flex w-full items-center justify-between gap-2 px-3 py-3 text-sm transition-colors',
              profile.value.biometric_lock
                ? 'text-accent bg-accent/10'
                : 'text-fg hover:bg-surface',
            ]}
            disabled={bioPending}
            onclick={() => void toggleBio()}
          >
            <span class="flex items-center gap-2">
              <Fingerprint size={14} class="shrink-0" />
              Захист Face ID / Touch ID
            </span>
            <span class="text-xs">
              {#if bioPending}
                …
              {:else if profile.value.biometric_lock}
                ON
              {:else}
                OFF
              {/if}
            </span>
          </button>
        {/if}
      </div>
    {/if}

    <p class="text-muted text-sm">
      Зміна параметрів перерахує норми для всіх майбутніх днів. Існуючі записи журналу не
      змінюються.
    </p>
  </div>

  <div class="flex flex-col gap-4 md:gap-5">
    <ProfileForm
      initial={profile.value}
      submitLabel="Зберегти"
      dirtyLabel="Зберегти зміни"
      onSubmit={save}
    />

    {#if savedRecently}
      <p class="text-ok text-center text-sm">Цілі оновлено за новим профілем</p>
    {/if}

    {#if profile.value}
      <ProjectionCard />
    {/if}
  </div>
</section>

<ChangelogModal open={changelogOpen} onClose={() => (changelogOpen = false)} />

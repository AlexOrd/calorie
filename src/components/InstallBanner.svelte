<script lang="ts">
  import { onMount } from 'svelte';
  import { Smartphone, X } from '@lucide/svelte';
  import { storage } from '$lib/storage';
  import { hapticImpact, hapticSelection } from '$lib/haptics';
  import { installState, promptInstall, type InstallState } from '$lib/install';

  const SHOWN_KEY = 'home_screen_prompt_shown';
  const VISIT_KEY = 'dashboard_visit_count';
  const VISIT_THRESHOLD = 3;

  let visible = $state(false);

  onMount(async () => {
    const visits = await storage.load<number>(VISIT_KEY, 0);
    const next = visits + 1;
    await storage.save(VISIT_KEY, next);

    const seen = await storage.load<{ seenAt: string } | null>(SHOWN_KEY, null);
    if (seen !== null) return;
    if (next < VISIT_THRESHOLD) return;

    const state: InstallState = await installState();
    if (state === 'missed' || state === 'unknown') {
      visible = true;
    }
  });

  async function handleInstall(): Promise<void> {
    hapticImpact('light');
    await promptInstall();
    visible = false;
    await storage.save(SHOWN_KEY, { seenAt: new Date().toISOString() });
  }

  async function handleDismiss(): Promise<void> {
    hapticSelection();
    visible = false;
    await storage.save(SHOWN_KEY, { seenAt: new Date().toISOString() });
  }
</script>

{#if visible}
  <div
    class="bg-accent/10 border-accent/20 flex items-center gap-3 rounded-xl border p-3"
    role="region"
    aria-label="Запрошення встановити додаток"
  >
    <Smartphone size={20} class="text-accent shrink-0" />
    <div class="min-w-0 flex-1">
      <div class="text-fg text-sm font-semibold">Встанови як додаток</div>
      <div class="text-muted text-xs">Швидкий доступ із головного екрану.</div>
    </div>
    <button
      type="button"
      class="bg-accent text-on-accent hover:bg-accent/90 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
      onclick={() => void handleInstall()}
    >
      Встановити
    </button>
    <button
      type="button"
      aria-label="Закрити"
      class="text-muted hover:text-fg rounded-md p-1 transition-colors"
      onclick={() => void handleDismiss()}
    >
      <X size={16} />
    </button>
  </div>
{/if}

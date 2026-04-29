<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Lock, Fingerprint } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { biometricSupport, verify, clearEnrolment } from '$lib/biometric';

  const IDLE_MS = 5 * 60 * 1000;

  let active = $state(false);
  let attempts = $state(0);
  let supported = $state(false);
  let lastInteraction = Date.now();
  let idleTimer: ReturnType<typeof setInterval> | null = null;
  let visibilityHandler: (() => void) | null = null;

  async function refreshSupport(): Promise<void> {
    const s = await biometricSupport();
    supported = s !== 'unsupported';
  }

  async function maybeLock(): Promise<void> {
    if (!profile.value?.biometric_lock) return;
    if (!supported) return;
    active = true;
    await runVerify();
  }

  async function runVerify(): Promise<void> {
    const ok = await verify();
    if (ok) {
      active = false;
      attempts = 0;
      lastInteraction = Date.now();
      return;
    }
    attempts += 1;
  }

  async function disableLock(): Promise<void> {
    await profile.setBiometricLock(false);
    await clearEnrolment();
    active = false;
    attempts = 0;
  }

  function recordInteraction(): void {
    lastInteraction = Date.now();
  }

  onMount(async () => {
    await refreshSupport();
    void maybeLock();

    idleTimer = setInterval(() => {
      if (active) return;
      if (!profile.value?.biometric_lock) return;
      if (Date.now() - lastInteraction >= IDLE_MS) {
        active = true;
        void runVerify();
      }
    }, 30000);

    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        if (!active && profile.value?.biometric_lock) {
          if (Date.now() - lastInteraction >= IDLE_MS) {
            active = true;
            void runVerify();
          }
        }
      } else {
        lastInteraction = Date.now();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    window.addEventListener('pointerdown', recordInteraction, { passive: true });
    window.addEventListener('keydown', recordInteraction);
  });

  onDestroy(() => {
    if (idleTimer !== null) clearInterval(idleTimer);
    if (visibilityHandler !== null)
      document.removeEventListener('visibilitychange', visibilityHandler);
    window.removeEventListener('pointerdown', recordInteraction);
    window.removeEventListener('keydown', recordInteraction);
  });
</script>

{#if active}
  <div
    class="bg-bg/80 fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-label="Розблокувати"
  >
    <div
      class="bg-accent/10 border-accent/30 flex h-16 w-16 items-center justify-center rounded-full border"
    >
      <Lock size={28} class="text-accent" />
    </div>
    <h2 class="text-fg text-lg font-semibold">Розблокувати Calorie</h2>
    <p class="text-muted text-sm">Підтверди особу за допомогою біометрії.</p>
    <button
      type="button"
      class="bg-accent text-on-accent hover:bg-accent/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
      onclick={() => void runVerify()}
    >
      <Fingerprint size={16} />
      Розблокувати
    </button>
    {#if attempts >= 3}
      <button
        type="button"
        class="text-muted hover:text-danger text-xs underline"
        onclick={() => void disableLock()}
      >
        Вимкнути блокування
      </button>
    {/if}
  </div>
{/if}

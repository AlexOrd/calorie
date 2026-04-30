<script lang="ts">
  import { onMount } from 'svelte';
  import { profile } from '$state/profile.svelte';
  import { activeDate } from '$state/activeDate.svelte';
  import { activeRoute } from '$state/route.svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { activity } from '$state/activity.svelte';
  import { changelogState } from '$state/changelog.svelte';
  import { weightLog } from '$state/weightLog.svelte';
  import { macroCrossings } from '$state/macroCrossings.svelte';
  import BottomNav from './components/BottomNav.svelte';
  import SideNav from './components/SideNav.svelte';
  import DateStrip from './components/DateStrip.svelte';
  import DesktopHeader from './components/DesktopHeader.svelte';
  import Dashboard from './routes/Dashboard.svelte';
  import Journal from './routes/Journal.svelte';
  import Activity from './routes/Activity.svelte';
  import Stats from './routes/Stats.svelte';
  import Profile from './routes/Profile.svelte';
  import Onboarding from './routes/Onboarding.svelte';
  import BiometricLockOverlay from './components/BiometricLockOverlay.svelte';

  let mainEl = $state<HTMLElement | undefined>(undefined);

  onMount(async () => {
    await Promise.all([profile.load(), changelogState.load(), weightLog.load()]);
    if (profile.hasProfile) {
      await Promise.all([
        dailyLog.load(activeDate.value),
        activity.load(activeDate.value),
        macroCrossings.load(activeDate.value),
      ]);
      void macroCrossings.pruneOlderThan(7);
    }
  });

  $effect(() => {
    if (!profile.hasProfile) return;
    const date = activeDate.value;
    void dailyLog.load(date);
    void activity.load(date);
    void macroCrossings.load(date);
  });

  $effect(() => {
    void activeRoute.value;
    mainEl?.scrollTo({ top: 0, behavior: 'instant' });
  });

  // True only when storage for the active date is fully loaded. Gates the
  // routes so user writes can't race with an in-flight load and get
  // overwritten when storage resolves (boot race + date-switch race).
  let dataReady = $derived(
    dailyLog.isReady && activity.isReady && macroCrossings.isLoaded(activeDate.value),
  );
</script>

{#if !profile.loaded || !changelogState.isLoaded}
  <div class="text-muted flex h-dvh items-center justify-center">Завантаження…</div>
{:else if !profile.hasProfile}
  <Onboarding />
{:else}
  <div class="flex h-dvh">
    <SideNav />
    <div class="flex flex-1 flex-col">
      <div class="md:hidden"><DateStrip /></div>
      <DesktopHeader />
      <main
        bind:this={mainEl}
        class="scroll-region mx-auto w-full max-w-6xl flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-2 md:px-6 md:py-6"
        style="scroll-padding-bottom: 16rem;"
      >
        {#if !dataReady}
          <div class="text-muted flex h-full items-center justify-center">Завантаження…</div>
        {:else}
          <div class:hidden={activeRoute.value !== 'dashboard'}><Dashboard /></div>
          <div class:hidden={activeRoute.value !== 'journal'}><Journal /></div>
          <div class:hidden={activeRoute.value !== 'activity'}><Activity /></div>
          <div class:hidden={activeRoute.value !== 'stats'}><Stats /></div>
          <div class:hidden={activeRoute.value !== 'profile'}><Profile /></div>
        {/if}
      </main>
      <BottomNav />
    </div>
  </div>
  <BiometricLockOverlay />
{/if}

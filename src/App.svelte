<script lang="ts">
  import { onMount } from 'svelte';
  import { profile } from '$state/profile.svelte';
  import { activeDate } from '$state/activeDate.svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import BottomNav from './components/BottomNav.svelte';
  import SideNav from './components/SideNav.svelte';
  import DateStrip from './components/DateStrip.svelte';
  import Dashboard from './routes/Dashboard.svelte';
  import Journal from './routes/Journal.svelte';
  import Stats from './routes/Stats.svelte';
  import Onboarding from './routes/Onboarding.svelte';
  import type { TabKey } from '$lib/nav';

  let currentTab = $state<TabKey>('dashboard');

  onMount(async () => {
    await profile.load();
    if (profile.hasProfile) {
      await dailyLog.load(activeDate.value);
    }
  });

  $effect(() => {
    if (!profile.hasProfile) return;
    void dailyLog.load(activeDate.value);
  });
</script>

{#if !profile.loaded}
  <div class="text-muted flex h-screen items-center justify-center">Завантаження…</div>
{:else if !profile.hasProfile}
  <Onboarding />
{:else}
  <div class="flex min-h-screen">
    <SideNav bind:current={currentTab} />
    <div class="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
      <DateStrip />
      <main class="mx-auto w-full max-w-5xl flex-1 px-2 md:px-6">
        <div class:hidden={currentTab !== 'dashboard'}><Dashboard /></div>
        <div class:hidden={currentTab !== 'journal'}><Journal /></div>
        <div class:hidden={currentTab !== 'stats'}><Stats /></div>
      </main>
    </div>
    <BottomNav bind:current={currentTab} />
  </div>
{/if}

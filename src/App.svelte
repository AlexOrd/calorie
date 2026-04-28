<script lang="ts">
  import { onMount } from 'svelte';
  import { profile } from '$state/profile.svelte';
  import { activeDate } from '$state/activeDate.svelte';
  import { activeRoute } from '$state/route.svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { activity } from '$state/activity.svelte';
  import BottomNav from './components/BottomNav.svelte';
  import SideNav from './components/SideNav.svelte';
  import DateStrip from './components/DateStrip.svelte';
  import Dashboard from './routes/Dashboard.svelte';
  import Journal from './routes/Journal.svelte';
  import Activity from './routes/Activity.svelte';
  import Stats from './routes/Stats.svelte';
  import Profile from './routes/Profile.svelte';
  import Onboarding from './routes/Onboarding.svelte';

  onMount(async () => {
    await profile.load();
    if (profile.hasProfile) {
      await Promise.all([dailyLog.load(activeDate.value), activity.load(activeDate.value)]);
    }
  });

  $effect(() => {
    if (!profile.hasProfile) return;
    const date = activeDate.value;
    void dailyLog.load(date);
    void activity.load(date);
  });
</script>

{#if !profile.loaded}
  <div class="text-muted flex h-screen items-center justify-center">Завантаження…</div>
{:else if !profile.hasProfile}
  <Onboarding />
{:else}
  <div class="flex min-h-screen">
    <SideNav />
    <div class="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
      <DateStrip />
      <main class="mx-auto w-full max-w-5xl flex-1 px-2 md:px-6">
        <div class:hidden={activeRoute.value !== 'dashboard'}><Dashboard /></div>
        <div class:hidden={activeRoute.value !== 'journal'}><Journal /></div>
        <div class:hidden={activeRoute.value !== 'activity'}><Activity /></div>
        <div class:hidden={activeRoute.value !== 'stats'}><Stats /></div>
        <div class:hidden={activeRoute.value !== 'profile'}><Profile /></div>
      </main>
    </div>
    <BottomNav />
  </div>
{/if}

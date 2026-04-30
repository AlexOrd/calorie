<script lang="ts">
  import { onMount } from 'svelte';
  import { Flame, Droplet } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { computeStreaks, type StreakStats } from '$lib/streaks';

  let stats = $state<StreakStats | null>(null);

  onMount(async () => {
    if (!profile.value) return;
    stats = await computeStreaks(profile.value);
  });

  function plural(n: number): string {
    if (n === 1) return 'день';
    if (n >= 2 && n <= 4) return 'дні';
    return 'днів';
  }

  let visible = $derived(stats !== null && (stats.deficit.current > 0 || stats.water.current > 0));
</script>

{#if stats && visible}
  <div
    class="border-border bg-surface-2 text-fg flex items-center justify-center gap-3 rounded-full border px-3 py-1.5 text-xs"
  >
    {#if stats.deficit.current > 0}
      <span class="flex items-center gap-1">
        <Flame size={12} class="text-accent" />
        <span class="tabular-nums">{stats.deficit.current}</span>
        <span>{plural(stats.deficit.current)} дефіциту</span>
      </span>
    {/if}
    {#if stats.deficit.current > 0 && stats.water.current > 0}
      <span class="text-muted">·</span>
    {/if}
    {#if stats.water.current > 0}
      <span class="flex items-center gap-1">
        <Droplet size={12} class="text-accent" />
        <span class="tabular-nums">{stats.water.current}</span>
        <span>{plural(stats.water.current)} води</span>
      </span>
    {/if}
  </div>
{/if}

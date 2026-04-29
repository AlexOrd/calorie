<script lang="ts">
  import { onMount } from 'svelte';
  import { Flame, Droplet, Salad } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { computeStreaks, type StreakStats } from '$lib/streaks';

  let stats = $state<StreakStats | null>(null);

  onMount(async () => {
    if (!profile.value) return;
    stats = await computeStreaks(profile.value);
  });

  function plural(n: number): string {
    if (n === 1) return '1 день';
    if (n >= 2 && n <= 4) return `${n} дні`;
    return `${n} днів`;
  }
</script>

{#if stats}
  <div class="grid grid-cols-3 gap-2">
    <div class="border-border bg-surface-2 flex flex-col gap-1 rounded-xl border p-3">
      <div class="flex items-center gap-1.5">
        <Flame size={14} class="text-accent" />
        <span class="text-muted text-[10px] font-semibold tracking-wider uppercase">Дефіцит</span>
      </div>
      <div class="text-fg text-lg leading-tight font-bold tabular-nums">
        {plural(stats.deficit.current)}
      </div>
      {#if stats.deficit.best > 0}
        <div class="text-muted text-[11px] tabular-nums">рекорд {stats.deficit.best}</div>
      {/if}
    </div>

    <div class="border-border bg-surface-2 flex flex-col gap-1 rounded-xl border p-3">
      <div class="flex items-center gap-1.5">
        <Droplet size={14} class="text-accent" />
        <span class="text-muted text-[10px] font-semibold tracking-wider uppercase">Вода</span>
      </div>
      <div class="text-fg text-lg leading-tight font-bold tabular-nums">
        {plural(stats.water.current)}
      </div>
      {#if stats.water.best > 0}
        <div class="text-muted text-[11px] tabular-nums">рекорд {stats.water.best}</div>
      {/if}
    </div>

    <div class="border-border bg-surface-2 flex flex-col gap-1 rounded-xl border p-3">
      <div class="flex items-center gap-1.5">
        <Salad size={14} class="text-accent" />
        <span class="text-muted text-[10px] font-semibold tracking-wider uppercase">Категорії</span>
      </div>
      <div class="text-fg text-lg leading-tight font-bold tabular-nums">
        {plural(stats.category.current)}
      </div>
      {#if stats.category.best > 0}
        <div class="text-muted text-[11px] tabular-nums">рекорд {stats.category.best}</div>
      {/if}
    </div>
  </div>
{/if}

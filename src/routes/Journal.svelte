<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import JournalRow from '../components/JournalRow.svelte';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey, FoodItem } from '$types/food';

  interface VisibleEntry {
    entry: LogEntry;
    item: FoodItem;
  }

  function lookup(catKey: CategoryKey, itemId: string): FoodItem | null {
    return personalizedDb()[catKey]?.items[itemId] ?? null;
  }

  let visible = $derived(
    [...dailyLog.entries]
      .map((e): VisibleEntry | null => {
        const item = lookup(e.cat, e.id);
        return item ? { entry: e, item } : null;
      })
      .filter((x): x is VisibleEntry => x !== null)
      .sort((a, b) => b.entry.ts - a.entry.ts),
  );
</script>

<section class="mx-auto max-w-2xl p-2 md:p-4">
  <h2 class="mb-3 text-xl font-semibold">Журнал</h2>

  {#if visible.length === 0}
    <p class="text-muted text-sm">Поки що нічого не додано.</p>
  {:else}
    <ul class="border-border bg-surface-2 flex flex-col rounded-md border">
      {#each visible as { entry, item } (entry.ts)}
        <div
          animate:flip={{ duration: 200 }}
          in:fly={{ y: 8, duration: 200 }}
          out:fly={{ x: -32, duration: 150 }}
        >
          <JournalRow {entry} {item} onDelete={dailyLog.remove} />
        </div>
      {/each}
    </ul>
  {/if}
</section>

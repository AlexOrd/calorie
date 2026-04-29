<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { Bookmark } from '@lucide/svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { hapticSelection } from '$lib/haptics';
  import JournalRow from '../components/JournalRow.svelte';
  import MealTemplatesSheet from '../components/MealTemplatesSheet.svelte';
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

  let templatesOpen = $state(false);

  function openTemplates(): void {
    hapticSelection();
    templatesOpen = true;
  }
</script>

<section class="mx-auto max-w-2xl p-2 md:p-4">
  <header class="mb-3 flex items-center justify-between">
    <h2 class="text-xl font-semibold">Журнал</h2>
    <button
      type="button"
      class="text-muted hover:text-fg border-border bg-surface-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
      onclick={openTemplates}
    >
      <Bookmark size={14} />
      Шаблони
    </button>
  </header>

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

<MealTemplatesSheet open={templatesOpen} onClose={() => (templatesOpen = false)} />

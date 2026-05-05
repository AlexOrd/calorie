<script lang="ts">
  import { Scale } from '@lucide/svelte';
  import { Trash2 } from '@lucide/svelte';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { weightLog } from '$state/weightLog.svelte';
  import { activeDate } from '$state/activeDate.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { confirmAsync } from '$lib/dialog';
  import { hapticImpact } from '$lib/haptics';
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

  let dateWeightKg = $derived(weightLog.value[activeDate.value] ?? null);

  async function deleteWeight(): Promise<void> {
    if (dateWeightKg === null) return;
    const ok = await confirmAsync(`Видалити запис ваги ${dateWeightKg.toFixed(1)} кг?`);
    if (!ok) return;
    hapticImpact('medium');
    await weightLog.removeForDate(activeDate.value);
  }
</script>

<section class="mx-auto max-w-2xl p-2 md:p-4">
  <header class="mb-3">
    <h2 class="text-xl font-semibold">Журнал</h2>
  </header>

  {#if visible.length === 0 && dateWeightKg === null}
    <p class="text-muted text-sm">Поки що нічого не додано.</p>
  {:else}
    <ul class="border-border bg-surface-2 flex flex-col rounded-md border">
      {#if dateWeightKg !== null}
        <li
          class="border-border flex items-center justify-between gap-3 border-b px-3 py-3.5"
          in:fly={{ y: 8, duration: 200 }}
          out:fly={{ x: -32, duration: 150 }}
        >
          <div class="flex min-w-0 flex-1 items-center gap-2.5">
            <Scale size={16} class="text-accent shrink-0" />
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="text-base font-semibold">Вага</span>
              <span class="text-muted text-xs">{dateWeightKg.toFixed(1)} кг</span>
            </div>
          </div>
          <button
            type="button"
            class="text-muted hover:text-danger border-border flex min-h-10 min-w-10 items-center justify-center rounded-md border px-2 transition-colors"
            onclick={() => void deleteWeight()}
            aria-label="Видалити запис ваги"
          >
            <Trash2 size={20} />
          </button>
        </li>
      {/if}
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

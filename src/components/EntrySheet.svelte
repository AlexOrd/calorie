<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { fly, scale } from 'svelte/transition';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { pulseSuccess } from '$lib/anim';
  import AmountInput from './AmountInput.svelte';
  import type { CategoryKey } from '$types/food';

  interface Props {
    open: boolean;
    categoryKey: CategoryKey | null;
  }
  let { open = $bindable(false), categoryKey }: Props = $props();

  const {
    elements: { overlay, content, close, portalled },
    states: { open: meltOpen },
  } = createDialog({ forceVisible: true });

  $effect(() => {
    meltOpen.set(open);
  });

  $effect(() => {
    open = $meltOpen;
  });

  let category = $derived(categoryKey ? personalizedDb()[categoryKey] : null);

  let expandedItem = $state<string | null>(null);
  let pct = $state(0);
  let cardElById = $state<Record<string, HTMLLIElement | undefined>>({});

  function expand(itemId: string): void {
    expandedItem = expandedItem === itemId ? null : itemId;
    pct = 0;
  }

  function commit(itemId: string): void {
    if (!categoryKey || pct <= 0) return;
    dailyLog.add({ id: itemId, cat: categoryKey, pct: Math.round(pct) });
    const el = cardElById[itemId];
    if (el) pulseSuccess(el);
    expandedItem = null;
    open = false;
  }
</script>

{#if $meltOpen && category}
  <div use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-40 bg-black/50"
      transition:scale={{ start: 0.98, duration: 150 }}
    ></div>

    <div
      use:melt={$content}
      class="bg-bg fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-auto rounded-t-2xl border-t border-white/10 p-4 md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border"
      transition:fly={{ y: 80, duration: 250 }}
      role="dialog"
      aria-modal="true"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{categoryKey} — {category.title}</h2>
        <button type="button" use:melt={$close} class="text-muted" aria-label="Закрити"> ✕ </button>
      </div>

      <ul class="flex flex-col gap-2">
        {#each Object.entries(category.items) as [id, item] (id)}
          <li bind:this={cardElById[id]} class="rounded-md border border-white/10 p-3">
            <button
              type="button"
              class="flex w-full items-center justify-between text-left"
              onclick={() => expand(id)}
            >
              <span>{item.name}</span>
              <span class="text-muted text-xs">
                100% = {item.max_g}
                {item.unit ?? 'г'}
              </span>
            </button>

            {#if expandedItem === id}
              <div class="mt-3 flex flex-col gap-3" transition:fly={{ y: -8, duration: 150 }}>
                <AmountInput {item} bind:pct />
                <button
                  type="button"
                  class="bg-accent self-end rounded-md px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={pct <= 0}
                  onclick={() => commit(id)}
                >
                  Додати
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

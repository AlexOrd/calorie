<script lang="ts">
  import { Trash2, X, Check } from '@lucide/svelte';
  import { formatTime } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import type { FoodItem } from '$types/food';

  interface Props {
    entry: LogEntry;
    item: FoodItem;
    onDelete: (ts: number) => void;
  }
  let { entry, item, onDelete }: Props = $props();

  let confirming = $state(false);

  let unit = $derived(item.unit ?? 'г');
  let amount = $derived(Math.round((item.max_g * entry.pct) / 100));
  let time = $derived(formatTime(entry.ts));

  function commitDelete(): void {
    onDelete(entry.ts);
  }
</script>

<li
  class="border-border flex items-center justify-between gap-3 border-b px-3 py-3.5 last:border-b-0"
>
  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
    <span class="truncate text-base">{item.name}</span>
    <span class="text-muted text-xs">
      {amount}
      {unit} · {Math.round(entry.pct)}% · {time}
    </span>
  </div>

  {#if confirming}
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="bg-danger text-on-accent flex min-h-10 min-w-10 items-center justify-center rounded-md px-2"
        onclick={commitDelete}
        aria-label="Підтвердити видалення"
      >
        <Check size={20} />
      </button>
      <button
        type="button"
        class="text-muted border-border flex min-h-10 min-w-10 items-center justify-center rounded-md border px-2"
        onclick={() => (confirming = false)}
        aria-label="Скасувати"
      >
        <X size={20} />
      </button>
    </div>
  {:else}
    <button
      type="button"
      class="text-muted hover:text-danger border-border flex min-h-10 min-w-10 items-center justify-center rounded-md border px-2 transition-colors"
      onclick={() => (confirming = true)}
      aria-label="Видалити запис"
    >
      <Trash2 size={20} />
    </button>
  {/if}
</li>

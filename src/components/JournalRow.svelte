<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { formatTime } from '$lib/date';
  import { confirmAsync } from '$lib/dialog';
  import { hapticImpact } from '$lib/haptics';
  import type { LogEntry } from '$types/log';
  import type { FoodItem } from '$types/food';

  interface Props {
    entry: LogEntry;
    item: FoodItem;
    onDelete: (ts: number) => void;
  }
  let { entry, item, onDelete }: Props = $props();

  let unit = $derived(item.unit ?? 'г');
  let amount = $derived(Math.round((item.max_g * entry.pct) / 100));
  let time = $derived(formatTime(entry.ts));

  async function handleDelete(): Promise<void> {
    const ok = await confirmAsync(`Видалити «${item.name}» (${amount} ${unit})?`);
    if (!ok) return;
    hapticImpact('medium');
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

  <button
    type="button"
    class="text-muted hover:text-danger border-border flex min-h-10 min-w-10 items-center justify-center rounded-md border px-2 transition-colors"
    onclick={() => void handleDelete()}
    aria-label="Видалити запис"
  >
    <Trash2 size={20} />
  </button>
</li>

<script lang="ts">
  import { Spring } from 'svelte/motion';
  import { Trash2 } from '@lucide/svelte';
  import { formatTime } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import type { FoodItem } from '$types/food';

  interface Props {
    entry: LogEntry;
    item: FoodItem;
    onDelete: (ts: number) => void;
  }
  let { entry, item, onDelete }: Props = $props();

  const offset = new Spring(0, { stiffness: 0.18, damping: 0.85 });
  let confirming = $state(false);
  let dragging = false;
  let startX = 0;

  const REVEAL = 88;

  function onPointerDown(e: PointerEvent): void {
    const target = e.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    if (window.matchMedia('(min-width: 768px)').matches) return;
    dragging = true;
    startX = e.clientX;
    target.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragging) return;
    const dx = Math.min(0, Math.max(-REVEAL, e.clientX - startX));
    void offset.set(dx, { hard: true });
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragging) return;
    const target = e.currentTarget;
    if (target instanceof HTMLElement) target.releasePointerCapture(e.pointerId);
    dragging = false;
    offset.target = offset.current < -REVEAL / 2 ? -REVEAL : 0;
  }

  let unit = $derived(item.unit ?? 'г');
  let amount = $derived(Math.round((item.max_g * entry.pct) / 100));
  let time = $derived(formatTime(entry.ts));

  function commitDelete(): void {
    onDelete(entry.ts);
  }
</script>

<li class="relative overflow-hidden border-b border-white/5">
  <button
    type="button"
    class="bg-danger absolute inset-y-0 right-0 flex w-[88px] items-center justify-center text-white"
    onclick={commitDelete}
    aria-label="Видалити запис"
  >
    <Trash2 size={18} />
  </button>

  <div
    class="group bg-bg relative flex items-center justify-between px-3 py-3"
    style="transform: translateX({offset.current}px);"
    role="presentation"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <div class="flex flex-col gap-0.5">
      <span class="text-sm">{item.name}</span>
      <span class="text-muted text-xs">
        {amount}
        {unit} · {Math.round(entry.pct)}% · {time}
      </span>
    </div>

    <div class="hidden items-center gap-2 md:flex">
      {#if confirming}
        <button
          type="button"
          class="bg-danger rounded-md px-2 py-1 text-xs text-white"
          onclick={commitDelete}
        >
          Видалити?
        </button>
        <button type="button" class="text-muted text-xs" onclick={() => (confirming = false)}>
          Ні
        </button>
      {:else}
        <button
          type="button"
          class="text-muted opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          onclick={() => (confirming = true)}
          aria-label="Видалити запис"
        >
          <Trash2 size={16} />
        </button>
      {/if}
    </div>
  </div>
</li>

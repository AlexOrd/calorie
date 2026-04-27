<script lang="ts">
  import { activeDate } from '$state/activeDate.svelte';
  import { addDays, dateFromKey, todayKey } from '$lib/date';

  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

  let anchor = $state(activeDate.value);

  let days = $derived(Array.from({ length: 7 }, (_, i) => addDays(anchor, i - 3)));

  function shift(days: number): void {
    anchor = addDays(anchor, days);
  }

  function dayLabel(key: string): string {
    const d = dateFromKey(key);
    const dow = (d.getDay() + 6) % 7;
    return WEEKDAYS[dow] ?? '';
  }

  function dayNum(key: string): number {
    return dateFromKey(key).getDate();
  }

  const today = todayKey();
</script>

<div
  class="flex items-center gap-1 border-b border-white/10 px-2 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:px-4"
>
  <button
    type="button"
    class="text-muted min-h-10 rounded px-3 py-2 text-base hover:bg-white/5"
    onclick={() => shift(-7)}
    aria-label="Попередній тиждень"
  >
    ‹
  </button>

  <div class="flex flex-1 justify-between gap-1">
    {#each days as key (key)}
      <button
        type="button"
        class={[
          'flex min-h-12 min-w-10 flex-col items-center justify-center rounded-md px-2 py-1.5 text-xs',
          activeDate.value === key
            ? 'bg-accent text-white'
            : key === today
              ? 'text-fg font-bold'
              : 'text-muted',
        ]}
        onclick={() => activeDate.set(key)}
      >
        <span>{dayLabel(key)}</span>
        <span class="text-lg font-semibold">{dayNum(key)}</span>
      </button>
    {/each}
  </div>

  <button
    type="button"
    class="text-muted min-h-10 rounded px-3 py-2 text-base hover:bg-white/5"
    onclick={() => shift(7)}
    aria-label="Наступний тиждень"
  >
    ›
  </button>
</div>

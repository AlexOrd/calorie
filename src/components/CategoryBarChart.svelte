<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'svelte-frappe-charts';
  import { storage } from '$lib/storage';
  import { addDays, todayKey } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import { CATEGORY_KEYS } from '$types/food';
  import type { CategoryKey } from '$types/food';

  let selected = $state<CategoryKey>('A');
  let labels = $state<string[]>([]);
  let series = $state<number[]>([]);
  let loaded = $state(false);

  async function load(): Promise<void> {
    const today = todayKey();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const totals: number[] = [];
    for (const d of days) {
      const entries = await storage.load<LogEntry[]>(`log_${d}`, []);
      const sum = entries.filter((e) => e.cat === selected).reduce((acc, e) => acc + e.pct, 0);
      totals.push(Math.round(sum));
    }
    labels = days.map((d) => d.slice(5));
    series = totals;
    loaded = true;
  }

  onMount(load);
  $effect(() => {
    void selected;
    void load();
  });

  let chartData = $derived({
    labels,
    datasets: [{ name: 'Споживання, %', values: series }],
    yMarkers: [{ label: '100%', value: 100, options: { labelPos: 'left' } }],
  });
</script>

<div class="rounded-md border border-white/10 p-3">
  <div class="mb-3 flex flex-wrap gap-1">
    {#each CATEGORY_KEYS as key (key)}
      <button
        type="button"
        class={[
          'rounded-md border border-white/10 px-2 py-1 text-xs',
          selected === key && 'bg-accent text-white',
        ]}
        onclick={() => (selected = key)}
      >
        {key}
      </button>
    {/each}
  </div>
  {#if loaded}
    <Chart type="bar" data={chartData} height={220} colors={['#4caf50']} />
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>

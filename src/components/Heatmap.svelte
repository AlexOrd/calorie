<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'svelte-frappe-charts';
  import { storage } from '$lib/storage';
  import { dateFromKey, dateFromLogKey, isLogKey } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  type DayVerdict = 0 | 1 | 2 | 3;

  let dataPoints = $state<Record<string, number>>({});
  let loaded = $state(false);

  function dayVerdict(entries: LogEntry[]): DayVerdict {
    if (entries.length === 0) return 0;
    const sums: Record<CategoryKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
      G: 0,
      H: 0,
    };
    for (const e of entries) sums[e.cat] += e.pct;
    const overCount = Object.values(sums).filter((v) => v > 100).length;
    if (overCount === 0) return 1;
    if (overCount <= 2) return 2;
    return 3;
  }

  onMount(async () => {
    const keys = (await storage.keys()).filter(isLogKey);
    const points: Record<string, number> = {};
    await Promise.all(
      keys.map(async (k) => {
        const date = dateFromLogKey(k);
        if (!date) return;
        const entries = await storage.load<LogEntry[]>(k, []);
        const ts = Math.floor(dateFromKey(date).getTime() / 1000);
        points[String(ts)] = dayVerdict(entries);
      }),
    );
    dataPoints = points;
    loaded = true;
  });

  let chartData = $derived({
    dataPoints,
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
</script>

<div class="rounded-md border border-white/10 p-3">
  <h3 class="mb-2 text-sm font-semibold">Останні 90 днів</h3>
  {#if loaded}
    <Chart
      type="heatmap"
      data={chartData}
      countLabel="перевищень"
      discreteDomains={1}
      colors={['#1f2937', '#86efac', '#fbbf24', '#ef4444']}
    />
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { storage } from '$lib/storage';
  import { addDays, dateFromKey, isLogKey, todayKey } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  // 0 = no data, 1 = clean, 2 = some over (1-2 categories), 3 = many over (3+)
  type DayVerdict = 0 | 1 | 2 | 3;

  const VERDICT_COLOR: Record<DayVerdict, string> = {
    0: 'rgba(255,255,255,0.06)',
    1: '#86efac',
    2: '#fbbf24',
    3: '#ef4444',
  };
  const VERDICT_LABEL: Record<DayVerdict, string> = {
    0: 'Без даних',
    1: 'У межах норм',
    2: '1–2 перевищення',
    3: '3+ перевищення',
  };

  const LEGEND_VERDICTS: DayVerdict[] = [1, 2, 3];

  const DAYS = 90;
  let verdictByKey = $state<Record<string, DayVerdict>>({});
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
    const allKeys = await storage.keys();
    const logKeys = allKeys.filter(isLogKey);
    const out: Record<string, DayVerdict> = {};
    await Promise.all(
      logKeys.map(async (k) => {
        const date = k.slice(4); // strip "log_"
        const entries = await storage.load<LogEntry[]>(k, []);
        out[date] = dayVerdict(entries);
      }),
    );
    verdictByKey = out;
    loaded = true;
  });

  interface Cell {
    key: string;
    verdict: DayVerdict;
  }

  // Build a grid: columns = weeks (most recent on the right), rows = days Mon-Sun.
  // Pre-resolve verdicts so the template doesn't need to narrow inside #each.
  let cells = $derived.by<(Cell | null)[]>(() => {
    const today = todayKey();
    const days: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) days.push(addDays(today, -i));
    const firstKey = days[0] ?? today;
    const firstDow = (dateFromKey(firstKey).getDay() + 6) % 7; // Mon=0..Sun=6
    const out: (Cell | null)[] = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (const d of days) out.push({ key: d, verdict: verdictByKey[d] ?? 0 });
    return out;
  });
</script>

<div class="border-border rounded-md border p-3">
  <h3 class="mb-2 text-sm font-semibold">Останні {DAYS} днів</h3>
  {#if loaded}
    <div class="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
      {#each cells as cell, i (cell?.key ?? `pad-${i}`)}
        {#if cell === null}
          <div class="h-3 w-3"></div>
        {:else}
          <div
            class="h-3 w-3 rounded-sm"
            style="background: {VERDICT_COLOR[cell.verdict]};"
            title="{cell.key}: {VERDICT_LABEL[cell.verdict]}"
          ></div>
        {/if}
      {/each}
    </div>

    <div class="text-muted mt-3 flex items-center gap-3 text-xs">
      {#each LEGEND_VERDICTS as v (v)}
        <span class="flex items-center gap-1">
          <span class="h-3 w-3 rounded-sm" style="background: {VERDICT_COLOR[v]};"></span>
          {VERDICT_LABEL[v]}
        </span>
      {/each}
    </div>
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>

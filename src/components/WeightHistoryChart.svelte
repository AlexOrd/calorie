<script lang="ts">
  import { onMount } from 'svelte';
  import { weightLog } from '$state/weightLog.svelte';
  import { profile } from '$state/profile.svelte';
  import { addDays, todayKey } from '$lib/date';

  const DAYS = 90;
  const W = 320;
  const H = 140;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;

  onMount(() => {
    if (!weightLog.isLoaded) void weightLog.load();
  });

  interface Point {
    iso: string;
    kg: number;
    x: number;
    y: number;
  }

  let series = $derived.by<Point[]>(() => {
    if (!weightLog.isLoaded) return [];
    const today = todayKey();
    const entries: { iso: string; kg: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const iso = addDays(today, -i);
      const kg = weightLog.value[iso];
      if (kg !== undefined) entries.push({ iso, kg });
    }
    if (entries.length === 0) return [];
    const kgs = entries.map((e) => e.kg);
    const minKg = Math.min(...kgs) - 0.5;
    const maxKg = Math.max(...kgs) + 0.5;
    const span = Math.max(0.1, maxKg - minKg);
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    return entries.map((e, i, arr) => {
      const x = arr.length === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (arr.length - 1)) * innerW;
      const y = PAD_T + innerH - ((e.kg - minKg) / span) * innerH;
      return { iso: e.iso, kg: e.kg, x, y };
    });
  });

  let bounds = $derived.by(() => {
    if (series.length === 0) return null;
    const kgs = series.map((p) => p.kg);
    return { min: Math.min(...kgs), max: Math.max(...kgs) };
  });

  let pathD = $derived(
    series.length === 0
      ? ''
      : series
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' '),
  );

  let areaD = $derived(
    series.length === 0
      ? ''
      : `${pathD} L ${series[series.length - 1]?.x ?? PAD_L} ${H - PAD_B} L ${series[0]?.x ?? PAD_L} ${H - PAD_B} Z`,
  );

  let targetY = $derived.by(() => {
    if (series.length === 0 || bounds === null) return null;
    const target = profile.value?.target_weight_kg;
    if (target === undefined || target === null) return null;
    const span = Math.max(0.1, bounds.max - bounds.min + 1);
    const innerH = H - PAD_T - PAD_B;
    const minKg = bounds.min - 0.5;
    const y = PAD_T + innerH - ((target - minKg) / span) * innerH;
    if (y < PAD_T - 4 || y > H - PAD_B + 4) return null;
    return { y, kg: target };
  });

  function shortDate(iso: string): string {
    return iso.slice(5);
  }
</script>

<div class="border-border bg-surface-2 flex flex-col gap-2 rounded-xl border p-4">
  <div class="flex items-baseline justify-between">
    <h3 class="text-fg text-sm font-semibold">Вага · 90 днів</h3>
    {#if bounds}
      <span class="text-muted text-xs tabular-nums">
        {bounds.min.toFixed(1)}–{bounds.max.toFixed(1)} кг
      </span>
    {/if}
  </div>

  {#if series.length === 0}
    <p class="text-muted py-6 text-center text-xs">
      Записи з'являться, щойно ти збережеш сьогоднішню вагу.
    </p>
  {:else}
    <svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label="Графік ваги за 90 днів">
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--color-border)" />
      {#if targetY}
        <line
          x1={PAD_L}
          y1={targetY.y}
          x2={W - PAD_R}
          y2={targetY.y}
          stroke="var(--color-ok)"
          stroke-dasharray="3 3"
        />
        <text
          x={W - PAD_R}
          y={targetY.y - 3}
          text-anchor="end"
          font-size="9"
          fill="var(--color-ok)"
        >
          ціль {targetY.kg.toFixed(1)}
        </text>
      {/if}

      <path d={areaD} fill="var(--color-accent)" opacity="0.15" />
      <path d={pathD} fill="none" stroke="var(--color-accent)" stroke-width="1.5" />

      {#each series as p (p.iso)}
        <circle cx={p.x} cy={p.y} r="2.5" fill="var(--color-accent)" />
      {/each}

      {#if series[0]}
        <text
          x={series[0].x}
          y={H - PAD_B + 12}
          text-anchor="start"
          font-size="9"
          fill="var(--color-muted)"
        >
          {shortDate(series[0].iso)}
        </text>
      {/if}
      {#if series.length > 1 && series[series.length - 1]}
        <text
          x={series[series.length - 1]?.x ?? PAD_L}
          y={H - PAD_B + 12}
          text-anchor="end"
          font-size="9"
          fill="var(--color-muted)"
        >
          {shortDate(series[series.length - 1]?.iso ?? '')}
        </text>
      {/if}
    </svg>
  {/if}
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { storage } from '$lib/storage';
  import { addDays, todayKey } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import { CATEGORY_KEYS } from '$types/food';
  import type { CategoryKey } from '$types/food';

  let selected = $state<CategoryKey>('A');
  let series = $state<{ label: string; value: number }[]>([]);
  let loaded = $state(false);

  async function load(): Promise<void> {
    const today = todayKey();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const next: { label: string; value: number }[] = [];
    for (const d of days) {
      const entries = await storage.load<LogEntry[]>(`log_${d}`, []);
      const sum = entries.filter((e) => e.cat === selected).reduce((acc, e) => acc + e.pct, 0);
      next.push({ label: d.slice(5), value: Math.round(sum) });
    }
    series = next;
    loaded = true;
  }

  onMount(load);
  $effect(() => {
    void selected;
    void load();
  });

  // SVG layout: 7 bars in a 280×180 viewbox. Bars cap visually at 150% of axis.
  const W = 280;
  const H = 180;
  const PAD_L = 28;
  const PAD_R = 8;
  const PAD_T = 10;
  const PAD_B = 24;
  const Y_MAX = 150; // visual cap
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  function barX(i: number, n: number): number {
    return PAD_L + (i + 0.15) * (innerW / n);
  }
  function barWidth(n: number): number {
    return (innerW / n) * 0.7;
  }
  function barY(value: number): number {
    return PAD_T + innerH - (Math.min(value, Y_MAX) / Y_MAX) * innerH;
  }
  function barH(value: number): number {
    return (Math.min(value, Y_MAX) / Y_MAX) * innerH;
  }

  // 100% reference line
  let yHundred = $derived(barY(100));
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
    <svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label="7-day bar chart">
      <!-- y-axis line -->
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="rgba(255,255,255,0.15)" />
      <!-- 100% reference line -->
      <line
        x1={PAD_L}
        y1={yHundred}
        x2={W - PAD_R}
        y2={yHundred}
        stroke="rgba(255,255,255,0.25)"
        stroke-dasharray="3 3"
      />
      <text
        x={PAD_L - 4}
        y={yHundred + 3}
        text-anchor="end"
        font-size="9"
        fill="rgba(255,255,255,0.5)">100</text
      >

      {#each series as point, i (point.label)}
        {@const over = point.value > 100}
        <rect
          x={barX(i, series.length)}
          y={barY(point.value)}
          width={barWidth(series.length)}
          height={barH(point.value)}
          fill={over ? 'var(--color-danger)' : 'var(--color-accent)'}
          rx="2"
        />
        <text
          x={barX(i, series.length) + barWidth(series.length) / 2}
          y={H - PAD_B + 12}
          text-anchor="middle"
          font-size="9"
          fill="rgba(255,255,255,0.5)"
        >
          {point.label}
        </text>
        <text
          x={barX(i, series.length) + barWidth(series.length) / 2}
          y={barY(point.value) - 3}
          text-anchor="middle"
          font-size="9"
          fill="rgba(255,255,255,0.7)"
        >
          {point.value}
        </text>
      {/each}
    </svg>
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>

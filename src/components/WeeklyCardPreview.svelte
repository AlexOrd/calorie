<script lang="ts">
  import { Flame, Droplet, Salad } from '@lucide/svelte';
  import type { WeeklyCardData } from '$lib/weeklyCard';

  interface Props {
    data: WeeklyCardData;
  }
  let { data }: Props = $props();

  function fmtSigned(n: number): string {
    if (n === 0) return '0';
    return n > 0 ? `+${n.toLocaleString('uk-UA')}` : `−${Math.abs(n).toLocaleString('uk-UA')}`;
  }

  function fmtDate(iso: string): string {
    return iso.slice(5).replace('-', '.');
  }

  let maxAbs = $derived(data.perDayDelta.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1);
  function barHeightPct(v: number): number {
    return Math.min(45, (Math.abs(v) / maxAbs) * 45);
  }
</script>

<div
  class="from-accent/15 via-bg to-warn/10 text-fg flex flex-col gap-10 bg-gradient-to-br p-16"
  style="width: 1080px; height: 1920px; font-family: system-ui, -apple-system, sans-serif;"
>
  <header class="flex items-center justify-between">
    <div class="text-fg/80 text-3xl font-bold tracking-wide">Calorie</div>
    <div class="text-muted text-2xl tabular-nums">
      {fmtDate(data.weekStartIso)} – {fmtDate(data.weekEndIso)}
    </div>
  </header>

  <div class="flex flex-col gap-3">
    <div class="text-muted text-3xl font-semibold tracking-wider uppercase">Тиждень підсумок</div>
    <div
      class={[
        'text-9xl leading-none font-extrabold tabular-nums',
        data.totalDeltaKcal < 0
          ? 'text-accent'
          : data.totalDeltaKcal > 0
            ? 'text-warn'
            : 'text-muted',
      ]}
    >
      {fmtSigned(data.totalDeltaKcal)}
    </div>
    <div class="text-muted text-3xl">ккал за 7 днів</div>
  </div>

  <div class="relative flex h-72 items-center justify-between">
    <div class="bg-border absolute inset-x-0 top-1/2 h-1"></div>
    {#each data.perDayDelta as v, i (i)}
      <div class="relative flex h-full w-24 items-center justify-center">
        {#if v < 0}
          <div
            class="bg-accent absolute top-1/2 left-1/2 w-16 -translate-x-1/2 rounded-md"
            style="height: {barHeightPct(v)}%;"
          ></div>
        {:else if v > 0}
          <div
            class="bg-warn absolute bottom-1/2 left-1/2 w-16 -translate-x-1/2 rounded-md"
            style="height: {barHeightPct(v)}%;"
          ></div>
        {:else}
          <div
            class="bg-muted absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          ></div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="flex flex-col gap-5 text-3xl">
    <div class="flex items-center gap-4">
      <Flame size={32} class="text-accent" />
      <span class="tabular-nums">{data.deficitDays} днів дефіциту</span>
    </div>
    <div class="flex items-center gap-4">
      <Droplet size={32} class="text-accent" />
      <span class="tabular-nums">{data.waterTargetHits}/7 водних цілей</span>
    </div>
    <div class="flex items-center gap-4">
      <Salad size={32} class="text-accent" />
      <span class="tabular-nums">{data.cleanCategoryDays} чистих категорій</span>
    </div>
  </div>

  <footer class="text-muted mt-auto flex items-baseline justify-between text-2xl">
    <span>згенеровано додатком Calorie</span>
    <span class="tabular-nums">v{data.appVersion}</span>
  </footer>
</div>

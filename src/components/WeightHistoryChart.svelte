<script lang="ts">
  import { onMount } from 'svelte';
  import { storage } from '$lib/storage';
  import { actualBurn } from '$lib/energy';
  import { sumMacros } from '$lib/macros';
  import {
    estimateDailyWeightTrend,
    projectGoalDate,
    type ProjectionResult,
  } from '$lib/projection';
  import { weightLog } from '$state/weightLog.svelte';
  import { profile } from '$state/profile.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { addDays, isLogKey, todayKey } from '$lib/date';
  import type { DayActivity } from '$types/activity';
  import type { LogEntry } from '$types/log';

  const DAYS_PAST = 60;
  const DAYS_FUTURE = 60;
  const TOTAL_SPAN = DAYS_PAST + DAYS_FUTURE;
  const W = 320;
  const H = 140;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const TODAY_X = PAD_L + (DAYS_PAST / TOTAL_SPAN) * (W - PAD_L - PAD_R);

  let projection = $state<ProjectionResult | null>(null);
  let projectionReason = $state<'no-target' | 'no-data' | 'wrong-direction' | null>(null);
  let trendKgPerDay = $state<number | null>(null);

  onMount(() => {
    if (!weightLog.isLoaded) {
      void weightLog.load().then(() => {
        void recalcProjection();
      });
      return;
    }
    void recalcProjection();
  });

  $effect(() => {
    if (!weightLog.isLoaded) return;
    if (!profile.value) return;
    void recalcProjection();
  });

  interface Point {
    iso: string;
    kg: number;
    dayOffset: number; // days from today (negative = past)
    x: number;
    y: number;
  }

  function kgToY(kg: number, minPad: number, span: number): number {
    const innerH = H - PAD_T - PAD_B;
    return PAD_T + innerH - ((kg - minPad) / span) * innerH;
  }

  interface Bounds {
    min: number;
    max: number;
    minPad: number;
    span: number;
  }

  let series = $derived.by<Point[]>(() => {
    if (!weightLog.isLoaded) return [];
    const today = todayKey();
    const entries: { iso: string; kg: number }[] = [];
    for (let i = DAYS_PAST - 1; i >= 0; i--) {
      const iso = addDays(today, -i);
      const kg = weightLog.value[iso];
      if (kg !== undefined && Number.isFinite(kg)) entries.push({ iso, kg });
    }
    if (entries.length === 0) return [];
    const target = profile.value?.target_weight_kg;
    const allKgs = [...entries.map((e) => e.kg)];
    if (target !== undefined) allKgs.push(target);
    const minKg = Math.min(...allKgs);
    const maxKg = Math.max(...allKgs);
    const minPad = minKg - 1;
    const maxPad = maxKg + 1;
    const span = Math.max(0.1, maxPad - minPad);
    const innerW = W - PAD_L - PAD_R;
    return entries.map((e) => {
      const dayOffset = daysBetween(today, e.iso); // negative for past
      const x = PAD_L + ((dayOffset + DAYS_PAST) / TOTAL_SPAN) * innerW;
      const y = kgToY(e.kg, minPad, span);
      return { iso: e.iso, kg: e.kg, dayOffset, x, y };
    });
  });

  let bounds = $derived.by<Bounds | null>(() => {
    if (series.length === 0) return null;
    const kgs = series.map((p) => p.kg);
    const target = profile.value?.target_weight_kg;
    if (target !== undefined) kgs.push(target);
    const min = Math.min(...kgs);
    const max = Math.max(...kgs);
    const minPad = min - 1;
    const maxPad = max + 1;
    const span = Math.max(0.1, maxPad - minPad);
    return { min, max, minPad, span };
  });

  let pathD = $derived(
    series.length === 0
      ? ''
      : series
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' '),
  );

  let areaD = $derived(
    series.length < 3
      ? ''
      : `${pathD} L ${series[series.length - 1]?.x ?? PAD_L} ${H - PAD_B} L ${series[0]?.x ?? PAD_L} ${H - PAD_B} Z`,
  );

  let targetY = $derived.by(() => {
    if (series.length === 0 || bounds === null) return null;
    const target = profile.value?.target_weight_kg;
    if (target === undefined || target === null) return null;
    const y = kgToY(target, bounds.minPad, bounds.span);
    if (y < PAD_T - 4 || y > H - PAD_B + 4) return null;
    return { y, kg: target };
  });

  let projectionLine = $derived.by(() => {
    if (series.length === 0 || bounds === null || trendKgPerDay === null) return null;
    if (!Number.isFinite(trendKgPerDay)) return null;
    const lastPoint = series[series.length - 1];
    if (!lastPoint) return null;
    const innerW = W - PAD_L - PAD_R;
    const endX = PAD_L + innerW;
    // Days from last actual point to DAYS_FUTURE ahead of today
    const daysFromLastToEnd = DAYS_FUTURE - lastPoint.dayOffset;
    const endKg = lastPoint.kg + trendKgPerDay * daysFromLastToEnd;
    if (!Number.isFinite(endKg)) return null;
    const endYRaw = kgToY(endKg, bounds.minPad, bounds.span);
    if (!Number.isFinite(endYRaw)) return null;
    const endY = Math.max(PAD_T, Math.min(H - PAD_B, endYRaw));
    const isOnTrack = projection !== null;
    return {
      x1: lastPoint.x,
      y1: lastPoint.y,
      x2: endX,
      y2: endY,
      color: isOnTrack ? 'var(--color-ok)' : 'var(--color-danger)',
      isOnTrack,
    };
  });

  let projectionPathD = $derived.by(() => {
    if (projectionLine === null) return '';
    const dx = projectionLine.x2 - projectionLine.x1;
    const cx = projectionLine.x1 + dx * 0.55;
    const cy = projectionLine.y1;
    return `M ${projectionLine.x1.toFixed(1)} ${projectionLine.y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${projectionLine.x2.toFixed(1)} ${projectionLine.y2.toFixed(1)}`;
  });

  const LABEL_MIN_GAP = 28;
  let showStartLabel = $derived.by(() => {
    const first = series[0];
    if (!first) return false;
    return Math.abs(first.x - TODAY_X) >= LABEL_MIN_GAP;
  });
  let showEtaLabel = $derived.by(() => {
    if (!projectionLine?.isOnTrack || !projection) return false;
    return Math.abs(projectionLine.x2 - TODAY_X) >= LABEL_MIN_GAP;
  });

  function shortDate(iso: string): string {
    return iso.slice(5);
  }

  function fmtDate(iso: string): string {
    const months = [
      'січ.',
      'лют.',
      'бер.',
      'квіт.',
      'трав.',
      'черв.',
      'лип.',
      'серп.',
      'вер.',
      'жовт.',
      'лист.',
      'груд.',
    ];
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${d} ${months[m - 1] ?? ''} ${y}`;
  }

  function daysBetween(fromIso: string, toIso: string): number {
    const from = new Date(`${fromIso}T00:00:00Z`).getTime();
    const to = new Date(`${toIso}T00:00:00Z`).getTime();
    const ms = to - from;
    return Math.round(ms / 86_400_000);
  }

  async function recalcProjection(): Promise<void> {
    projection = null;
    projectionReason = null;
    trendKgPerDay = null;
    const current = profile.value;
    if (!current || current.target_weight_kg === undefined) {
      projectionReason = 'no-target';
      return;
    }

    const today = todayKey();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) dates.push(addDays(today, -i));

    const allKeys = await storage.keys();
    const logSet = new Set(allKeys.filter(isLogKey).map((k) => k.slice(4)));
    const recentDailyDeltas: number[] = [];
    const recentWeights: { iso: string; kg: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const iso = addDays(today, -i);
      const kg = weightLog.value[iso];
      if (kg !== undefined && Number.isFinite(kg)) recentWeights.push({ iso, kg });
    }

    for (const date of dates) {
      if (!logSet.has(date)) continue;
      const entries = await storage.load<LogEntry[]>(`log_${date}`, []);
      if (entries.length === 0) continue;
      const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
        steps: 0,
        trainings: 0,
        waterMl: 0,
      });
      const intake = sumMacros(entries, personalizedDb()).kcal;
      const burn = actualBurn(current, dayAct);
      const delta = intake - burn;
      if (Number.isFinite(delta)) recentDailyDeltas.push(delta);
    }

    if (recentDailyDeltas.length === 0) {
      projectionReason = 'no-data';
      return;
    }

    // Compute trend regardless of direction (used for red projection line)
    trendKgPerDay = estimateDailyWeightTrend({ recentDailyDeltas, recentWeights });

    const result = projectGoalDate({
      todayIso: today,
      currentWeightKg: current.weight,
      targetWeightKg: current.target_weight_kg,
      recentDailyDeltas,
      recentWeights,
    });

    if (result === null) {
      projectionReason = 'wrong-direction';
      return;
    }

    projection = result;
  }
</script>

<div class="border-border bg-surface-2 flex flex-col gap-2 rounded-xl border p-4">
  <div class="flex items-baseline justify-between">
    <h3 class="text-fg text-sm font-semibold">Вага · сьогодні по центру</h3>
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
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--color-border)" />
      <!-- Today vertical reference -->
      <line
        x1={TODAY_X}
        y1={PAD_T}
        x2={TODAY_X}
        y2={H - PAD_B}
        stroke="var(--color-border)"
        stroke-dasharray="2 3"
      />
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
          x={PAD_L + 2}
          y={targetY.y - 3}
          text-anchor="start"
          font-size="9"
          fill="var(--color-ok)"
        >
          ціль {targetY.kg.toFixed(1)}
        </text>
      {/if}

      {#if areaD !== ''}
        <path d={areaD} fill="var(--color-accent)" opacity="0.15" />
      {/if}
      <path d={pathD} fill="none" stroke="var(--color-accent)" stroke-width="1.5" />

      {#if projectionLine && projectionPathD !== ''}
        <path
          d={projectionPathD}
          stroke={projectionLine.color}
          stroke-width="1.5"
          stroke-dasharray="4 3"
          fill="none"
        />
      {/if}

      {#each series as p (p.iso)}
        <circle cx={p.x} cy={p.y} r="2.5" fill="var(--color-accent)" />
      {/each}

      <!-- X-axis labels -->
      {#if showStartLabel && series[0]}
        <text
          x={series[0].x}
          y={H - PAD_B + 16}
          text-anchor="start"
          font-size="9"
          fill="var(--color-muted)"
        >
          {shortDate(series[0].iso)}
        </text>
      {/if}
      <text
        x={TODAY_X}
        y={H - PAD_B + 16}
        text-anchor="middle"
        font-size="9"
        fill="var(--color-muted)"
      >
        сьогодні
      </text>
      {#if showEtaLabel && projectionLine?.isOnTrack && projection}
        <text
          x={projectionLine.x2}
          y={H - PAD_B + 16}
          text-anchor="end"
          font-size="9"
          fill="var(--color-ok)"
        >
          {shortDate(projection.etaIso)}
        </text>
      {/if}
    </svg>

    {#if projectionLine?.isOnTrack && projection}
      <p class="text-muted text-xs">
        Прогноз: ціль через {projection.daysAway} днів ({fmtDate(projection.etaIso)}).
      </p>
    {:else if projectionLine && !projectionLine.isOnTrack}
      <p class="text-muted text-xs">Поточний темп не веде до цілі — пунктир показує куди.</p>
    {:else if projectionReason === 'no-target'}
      <p class="text-muted text-xs">Додай цільову вагу у профілі, щоб побачити прогноз.</p>
    {:else if projectionReason === 'no-data'}
      <p class="text-muted text-xs">
        Для прогнозу потрібні записи журналу хоча б за один із останніх 7 днів.
      </p>
    {/if}
  {/if}
</div>

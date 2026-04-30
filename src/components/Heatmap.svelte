<script lang="ts">
  import { onMount } from 'svelte';
  import { storage } from '$lib/storage';
  import { addDays, dateFromKey, isLogKey, todayKey } from '$lib/date';
  import { profile } from '$state/profile.svelte';
  import { sumMacros } from '$lib/macros';
  import { personalizedDb } from '$state/personalizedDb';
  import { actualBurn, energyBalance, type BalanceState } from '$lib/energy';
  import {
    hydrationState,
    hydrationTarget,
    isHydrationSevereDeficit,
    type HydrationState,
  } from '$lib/hydration';
  import type { DayActivity } from '$state/activity.svelte';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  type DayVerdict = 0 | 1 | 2 | 3;
  type BalanceVerdict = BalanceState | 'none';
  type HydrationVerdict = HydrationState | 'none';

  const DAYS = 90;
  const STRIP_DAYS = 13;

  const BALANCE_COLOR: Record<BalanceVerdict, string> = {
    none: 'var(--color-border)',
    deficit: 'var(--color-accent)',
    balanced: 'var(--color-muted)',
    surplus: 'var(--color-warn)',
  };
  const BALANCE_LABEL: Record<BalanceVerdict, string> = {
    none: 'Без даних',
    deficit: 'Дефіцит',
    balanced: 'Баланс',
    surplus: 'Профіцит',
  };
  const LEGEND_BALANCES: BalanceVerdict[] = ['deficit', 'balanced', 'surplus'];

  const VERDICT_COLOR: Record<DayVerdict, string> = {
    0: 'var(--color-border)',
    1: 'var(--color-ok)',
    2: 'var(--color-warn)',
    3: 'var(--color-danger)',
  };
  const VERDICT_LABEL: Record<DayVerdict, string> = {
    0: 'Без даних',
    1: 'У межах норм',
    2: '1–2 перевищення',
    3: '3+ перевищень',
  };
  const LEGEND_VERDICTS: DayVerdict[] = [1, 2, 3];

  const HYDRATION_COLOR: Record<HydrationVerdict, string> = {
    none: 'var(--color-border)',
    deficit: 'var(--color-danger)',
    balanced: 'var(--color-ok)',
    surplus: 'var(--color-fat)',
  };
  const HYDRATION_LABEL: Record<HydrationVerdict, string> = {
    none: 'Без даних',
    deficit: 'Нестача',
    balanced: 'Норма',
    surplus: 'Понад норму',
  };
  const LEGEND_HYDRATION: HydrationVerdict[] = ['deficit', 'balanced', 'surplus'];

  let balanceByKey = $state<Record<string, BalanceVerdict>>({});
  let verdictByKey = $state<Record<string, DayVerdict>>({});
  let hydrationByKey = $state<Record<string, HydrationVerdict>>({});
  let loaded = $state(false);

  function dayVerdict(entries: LogEntry[], hydrationDeficitSevere: boolean): DayVerdict {
    if (entries.length === 0 && !hydrationDeficitSevere) return 0;
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
    let overCount = Object.values(sums).filter((v) => v > 100).length;
    if (hydrationDeficitSevere) overCount += 1;
    if (overCount === 0) return 1;
    if (overCount <= 2) return 2;
    return 3;
  }

  onMount(async () => {
    const allKeys = await storage.keys();
    const logKeys = allKeys.filter(isLogKey);
    const balances: Record<string, BalanceVerdict> = {};
    const verdicts: Record<string, DayVerdict> = {};
    const hydrations: Record<string, HydrationVerdict> = {};

    const target = profile.value ? hydrationTarget(profile.value) : 0;

    await Promise.all(
      logKeys.map(async (k) => {
        const date = k.slice(4);
        const entries = await storage.load<LogEntry[]>(k, []);
        const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
          steps: 0,
          trainings: 0,
          waterMl: 0,
        });

        const severe = target > 0 && isHydrationSevereDeficit(dayAct.waterMl, target);
        verdicts[date] = dayVerdict(entries, severe);

        if (profile.value && entries.length > 0) {
          const intake = sumMacros(entries, personalizedDb()).kcal;
          const burn = actualBurn(profile.value, dayAct);
          balances[date] = energyBalance(intake, burn).state;
        } else {
          balances[date] = 'none';
        }

        if (target > 0 && dayAct.waterMl > 0) {
          hydrations[date] = hydrationState(dayAct.waterMl, target);
        } else {
          hydrations[date] = 'none';
        }
      }),
    );

    balanceByKey = balances;
    verdictByKey = verdicts;
    hydrationByKey = hydrations;
    loaded = true;
  });

  interface Cell {
    key: string;
    balance: BalanceVerdict;
  }

  let gridCells = $derived.by<(Cell | null)[]>(() => {
    const today = todayKey();
    const dates: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) dates.push(addDays(today, -i));
    const out: (Cell | null)[] = [];
    for (const d of dates) {
      out.push({ key: d, balance: balanceByKey[d] ?? 'none' });
    }
    const trailingPad = (7 - (dates.length % 7)) % 7;
    for (let i = 0; i < trailingPad; i++) out.push(null);
    return out;
  });

  let verdictCells = $derived.by<{ key: string; verdict: DayVerdict }[]>(() => {
    const today = todayKey();
    const out: { key: string; verdict: DayVerdict }[] = [];
    for (let i = STRIP_DAYS - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      out.push({ key: d, verdict: verdictByKey[d] ?? 0 });
    }
    return out;
  });

  let hydrationCells = $derived.by<{ key: string; hydration: HydrationVerdict }[]>(() => {
    const today = todayKey();
    const out: { key: string; hydration: HydrationVerdict }[] = [];
    for (let i = STRIP_DAYS - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      out.push({ key: d, hydration: hydrationByKey[d] ?? 'none' });
    }
    return out;
  });
</script>

<div class="border-border bg-surface-2 flex flex-col gap-3 rounded-xl border p-4">
  <h3 class="text-fg text-sm font-semibold">Останні {DAYS} днів</h3>

  {#if loaded}
    <!-- Section 1: 90-day energy balance grid -->
    <div class="flex flex-col gap-1.5">
      <div class="grid grid-flow-col grid-cols-[repeat(13,minmax(0,1fr))] grid-rows-7 gap-1">
        {#each gridCells as cell, i (cell?.key ?? `pad-${i}`)}
          {#if cell === null}
            <div class="aspect-square"></div>
          {:else}
            {@const isFirstOfMonth = dateFromKey(cell.key).getDate() === 1}
            <div
              class={[
                'aspect-square rounded-sm transition-colors',
                isFirstOfMonth && 'ring-fg/40 ring-1 ring-inset',
              ]}
              style="background: {BALANCE_COLOR[cell.balance]};"
              title={isFirstOfMonth
                ? `${cell.key} (1-е) — ${BALANCE_LABEL[cell.balance]}`
                : `${cell.key}: ${BALANCE_LABEL[cell.balance]}`}
            ></div>
          {/if}
        {/each}
      </div>
      <div class="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {#each LEGEND_BALANCES as b (b)}
          <span class="flex items-center gap-1">
            <span class="h-2.5 w-2.5 rounded-sm" style="background: {BALANCE_COLOR[b]};"></span>
            {BALANCE_LABEL[b]}
          </span>
        {/each}
      </div>
    </div>

    <!-- Section 2: Categories strip (last 13 days) -->
    <div class="flex flex-col gap-1.5">
      <h4 class="text-muted text-[11px] font-semibold tracking-wider uppercase">
        Категорії · {STRIP_DAYS} днів
      </h4>
      <div class="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
        {#each verdictCells as cell (cell.key)}
          <div
            class="aspect-square rounded-sm transition-colors"
            style="background: {VERDICT_COLOR[cell.verdict]};"
            title="{cell.key}: {VERDICT_LABEL[cell.verdict]}"
          ></div>
        {/each}
      </div>
      <div class="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {#each LEGEND_VERDICTS as v (v)}
          <span class="flex items-center gap-1">
            <span class="h-2.5 w-2.5 rounded-sm" style="background: {VERDICT_COLOR[v]};"></span>
            {VERDICT_LABEL[v]}
          </span>
        {/each}
      </div>
    </div>

    <!-- Section 3: Hydration strip (last 13 days) -->
    <div class="flex flex-col gap-1.5">
      <h4 class="text-muted text-[11px] font-semibold tracking-wider uppercase">
        Гідрація · {STRIP_DAYS} днів
      </h4>
      <div class="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
        {#each hydrationCells as cell (cell.key)}
          <div
            class="aspect-square rounded-sm transition-colors"
            style="background: {HYDRATION_COLOR[cell.hydration]};"
            title="{cell.key}: {HYDRATION_LABEL[cell.hydration]}"
          ></div>
        {/each}
      </div>
      <div class="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {#each LEGEND_HYDRATION as h (h)}
          <span class="flex items-center gap-1">
            <span class="h-2.5 w-2.5 rounded-sm" style="background: {HYDRATION_COLOR[h]};"></span>
            {HYDRATION_LABEL[h]}
          </span>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>

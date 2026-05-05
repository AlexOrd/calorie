<script lang="ts">
  import { onMount } from 'svelte';
  import { storage } from '$lib/storage';
  import { addDays, dateFromKey, isLogKey, startOfWeek, todayKey } from '$lib/date';
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
  import type { DayActivity } from '$types/activity';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  type DayVerdict = 0 | 1 | 2 | 3;
  type BalanceVerdict = BalanceState | 'none';
  type HydrationVerdict = HydrationState | 'none';
  type HeatmapKind = 'balance' | 'categories' | 'hydration';

  interface CalendarCell {
    key: string;
    isToday: boolean;
    isFirstOfMonth: boolean;
    balance: BalanceVerdict;
    verdict: DayVerdict;
    hydration: HydrationVerdict;
  }

  const DAYS = 90;
  const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const;

  const BALANCE_COLOR: Record<BalanceVerdict, string> = {
    none: 'var(--color-border)',
    deficit: 'var(--color-ok)',
    balanced: 'var(--color-accent)',
    surplus: 'var(--color-danger)',
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
    surplus: 'var(--color-accent)',
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
    for (const entry of entries) sums[entry.cat] += entry.pct;
    let overCount = Object.values(sums).filter((value) => value > 100).length;
    if (hydrationDeficitSevere) overCount += 1;
    if (overCount === 0) return 1;
    if (overCount <= 2) return 2;
    return 3;
  }

  function cellColor(cell: CalendarCell, kind: HeatmapKind): string {
    if (kind === 'balance') return BALANCE_COLOR[cell.balance];
    if (kind === 'categories') return VERDICT_COLOR[cell.verdict];
    return HYDRATION_COLOR[cell.hydration];
  }

  function cellLabel(cell: CalendarCell, kind: HeatmapKind): string {
    if (kind === 'balance') return BALANCE_LABEL[cell.balance];
    if (kind === 'categories') return VERDICT_LABEL[cell.verdict];
    return HYDRATION_LABEL[cell.hydration];
  }

  function buildCalendar(days: number): (CalendarCell | null)[] {
    const today = todayKey();
    const start = addDays(today, -(days - 1));
    const calendarStart = startOfWeek(start);
    const out: (CalendarCell | null)[] = [];
    const totalCells = Math.ceil((days + ((dateFromKey(start).getDay() + 6) % 7)) / 7) * 7;

    for (let offset = 0; offset < totalCells; offset++) {
      const dateKey = addDays(calendarStart, offset);
      if (dateKey < start || dateKey > today) {
        out.push(null);
        continue;
      }
      const dateObj = dateFromKey(dateKey);
      out.push({
        key: dateKey,
        isToday: dateKey === today,
        isFirstOfMonth: dateObj.getDate() === 1,
        balance: balanceByKey[dateKey] ?? 'none',
        verdict: verdictByKey[dateKey] ?? 0,
        hydration: hydrationByKey[dateKey] ?? 'none',
      });
    }

    return out;
  }

  let balanceCells = $derived.by(() => buildCalendar(DAYS));
  let categoryCells = $derived.by(() => buildCalendar(DAYS));
  let hydrationCells = $derived.by(() => buildCalendar(DAYS));

  let balanceWeeks = $derived(Math.ceil(balanceCells.length / 7));
  let categoryWeeks = $derived(Math.ceil(categoryCells.length / 7));
  let hydrationWeeks = $derived(Math.ceil(hydrationCells.length / 7));

  onMount(async () => {
    const allKeys = await storage.keys();
    const logKeys = allKeys.filter(isLogKey);
    const balances: Record<string, BalanceVerdict> = {};
    const verdicts: Record<string, DayVerdict> = {};
    const hydrations: Record<string, HydrationVerdict> = {};

    const target = profile.value ? hydrationTarget(profile.value) : 0;

    await Promise.all(
      logKeys.map(async (key) => {
        const date = key.slice(4);
        const entries = await storage.load<LogEntry[]>(key, []);
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
</script>

<div class="border-border bg-surface-2 flex flex-col gap-4 rounded-xl border p-4">
  <div class="flex items-center justify-between gap-3">
    <h3 class="text-fg text-sm font-semibold">Останні {DAYS} днів</h3>
    <span class="text-muted text-[11px]">кожен квадрат = 1 день</span>
  </div>

  {#if loaded}
    <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
      <div class="text-muted grid grid-rows-7 items-center gap-1 text-[10px]">
        {#each WEEKDAY_LABELS as day (day)}
          <span class="flex h-5 items-center">{day}</span>
        {/each}
      </div>
      <div
        class="grid grid-flow-col grid-rows-7 gap-1"
        style={`grid-template-columns: repeat(${balanceWeeks}, minmax(0, 1fr));`}
      >
        {#each balanceCells as cell, i (cell?.key ?? `balance-pad-${i}`)}
          {#if cell === null}
            <div class="h-5 w-5"></div>
          {:else}
            <div
              class={[
                'h-5 w-5 rounded-md border transition-colors',
                cell.isToday ? 'border-fg/70' : 'border-transparent',
                cell.isFirstOfMonth ? 'ring-fg/25 ring-1 ring-inset' : '',
              ]}
              style={`background: ${cellColor(cell, 'balance')};`}
              title={`${cell.key}: ${cellLabel(cell, 'balance')}${cell.isToday ? ' · сьогодні' : ''}`}
            ></div>
          {/if}
        {/each}
      </div>
    </div>

    <div class="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
      {#each LEGEND_BALANCES as key (key)}
        <span class="flex items-center gap-1.5">
          <span class="h-3 w-3 rounded-sm" style={`background: ${BALANCE_COLOR[key]};`}></span>
          {BALANCE_LABEL[key]}
        </span>
      {/each}
      <span class="flex items-center gap-1.5">
        <span class="border-fg/70 h-3 w-3 rounded-sm border bg-transparent"></span>
        Сьогодні
      </span>
      <span class="flex items-center gap-1.5">
        <span class="ring-fg/25 h-3 w-3 rounded-sm bg-transparent ring-1 ring-inset"></span>
        1-е число місяця
      </span>
    </div>

    <div class="border-border/70 border-t pt-1">
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h4 class="text-fg text-[11px] font-semibold tracking-wider uppercase">
          Категорії · 90 днів
        </h4>
        <span class="text-muted text-[11px]">перевищення квот за день</span>
      </div>
      <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <div class="text-muted grid grid-rows-7 items-center gap-1 text-[10px]">
          {#each WEEKDAY_LABELS as day (day)}
            <span class="flex h-5 items-center">{day}</span>
          {/each}
        </div>
        <div
          class="grid grid-flow-col grid-rows-7 gap-1"
          style={`grid-template-columns: repeat(${categoryWeeks}, minmax(0, 1fr));`}
        >
          {#each categoryCells as cell, i (cell?.key ?? `cat-pad-${i}`)}
            {#if cell === null}
              <div class="h-5 w-5"></div>
            {:else}
              <div
                class={[
                  'h-5 w-5 rounded-md border transition-colors',
                  cell.isToday ? 'border-fg/70' : 'border-transparent',
                  cell.isFirstOfMonth ? 'ring-fg/25 ring-1 ring-inset' : '',
                ]}
                style={`background: ${cellColor(cell, 'categories')};`}
                title={`${cell.key}: ${cellLabel(cell, 'categories')}${cell.isToday ? ' · сьогодні' : ''}`}
              ></div>
            {/if}
          {/each}
        </div>
      </div>
      <div class="text-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        {#each LEGEND_VERDICTS as key (key)}
          <span class="flex items-center gap-1.5">
            <span class="h-3 w-3 rounded-sm" style={`background: ${VERDICT_COLOR[key]};`}></span>
            {VERDICT_LABEL[key]}
          </span>
        {/each}
      </div>
    </div>

    <div class="border-border/70 border-t pt-1">
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h4 class="text-fg text-[11px] font-semibold tracking-wider uppercase">
          Гідрація · 90 днів
        </h4>
        <span class="text-muted text-[11px]">стан води за день</span>
      </div>
      <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <div class="text-muted grid grid-rows-7 items-center gap-1 text-[10px]">
          {#each WEEKDAY_LABELS as day (day)}
            <span class="flex h-5 items-center">{day}</span>
          {/each}
        </div>
        <div
          class="grid grid-flow-col grid-rows-7 gap-1"
          style={`grid-template-columns: repeat(${hydrationWeeks}, minmax(0, 1fr));`}
        >
          {#each hydrationCells as cell, i (cell?.key ?? `hyd-pad-${i}`)}
            {#if cell === null}
              <div class="h-5 w-5"></div>
            {:else}
              <div
                class={[
                  'h-5 w-5 rounded-md border transition-colors',
                  cell.isToday ? 'border-fg/70' : 'border-transparent',
                  cell.isFirstOfMonth ? 'ring-fg/25 ring-1 ring-inset' : '',
                ]}
                style={`background: ${cellColor(cell, 'hydration')};`}
                title={`${cell.key}: ${cellLabel(cell, 'hydration')}${cell.isToday ? ' · сьогодні' : ''}`}
              ></div>
            {/if}
          {/each}
        </div>
      </div>
      <div class="text-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        {#each LEGEND_HYDRATION as key (key)}
          <span class="flex items-center gap-1.5">
            <span class="h-3 w-3 rounded-sm" style={`background: ${HYDRATION_COLOR[key]};`}></span>
            {HYDRATION_LABEL[key]}
          </span>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>

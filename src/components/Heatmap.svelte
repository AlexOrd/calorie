<script lang="ts">
  import { onMount } from 'svelte';
  import { storage } from '$lib/storage';
  import { addDays, dateFromKey, isLogKey, todayKey } from '$lib/date';
  import { profile } from '$state/profile.svelte';
  import { sumMacros } from '$lib/macros';
  import { personalizedDb } from '$state/personalizedDb';
  import { actualBurn, energyBalance, type BalanceState } from '$lib/energy';
  import type { DayActivity } from '$state/activity.svelte';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  // 0 = no data, 1 = clean, 2 = some over (1-2 categories), 3 = many over (3+)
  type DayVerdict = 0 | 1 | 2 | 3;
  type BalanceVerdict = 'none' | BalanceState;

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

  const BALANCE_COLOR: Record<BalanceVerdict, string> = {
    none: 'rgba(255,255,255,0.06)',
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

  const DAYS = 90;
  let verdictByKey = $state<Record<string, DayVerdict>>({});
  let balanceByKey = $state<Record<string, BalanceVerdict>>({});
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
    const verdicts: Record<string, DayVerdict> = {};
    const balances: Record<string, BalanceVerdict> = {};

    await Promise.all(
      logKeys.map(async (k) => {
        const date = k.slice(4); // strip "log_"
        const entries = await storage.load<LogEntry[]>(k, []);
        verdicts[date] = dayVerdict(entries);

        if (profile.value && entries.length > 0) {
          const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
            steps: 0,
            trainings: 0,
            waterMl: 0,
          });
          const intake = sumMacros(entries, personalizedDb()).kcal;
          const burn = actualBurn(profile.value, dayAct);
          balances[date] = energyBalance(intake, burn).state;
        } else {
          balances[date] = 'none';
        }
      }),
    );
    verdictByKey = verdicts;
    balanceByKey = balances;
    loaded = true;
  });

  interface Cell {
    key: string;
    verdict: DayVerdict;
    balance: BalanceVerdict;
  }

  let cells = $derived.by<(Cell | null)[]>(() => {
    const today = todayKey();
    const days: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) days.push(addDays(today, -i));
    const firstKey = days[0] ?? today;
    const firstDow = (dateFromKey(firstKey).getDay() + 6) % 7;
    const out: (Cell | null)[] = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (const d of days) {
      out.push({
        key: d,
        verdict: verdictByKey[d] ?? 0,
        balance: balanceByKey[d] ?? 'none',
      });
    }
    return out;
  });

  // Per-day balance strip uses just the date sequence (no padding row needed).
  let balanceCells = $derived.by<{ key: string; balance: BalanceVerdict }[]>(() => {
    const today = todayKey();
    const out: { key: string; balance: BalanceVerdict }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      out.push({ key: d, balance: balanceByKey[d] ?? 'none' });
    }
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

    <h4 class="text-muted mt-3 mb-2 text-xs font-semibold tracking-wider uppercase">
      Енергобаланс
    </h4>
    <div class="flex gap-1 overflow-x-auto">
      {#each balanceCells as cell (cell.key)}
        <div
          class="h-3 w-3 shrink-0 rounded-sm"
          style="background: {BALANCE_COLOR[cell.balance]};"
          title="{cell.key}: {BALANCE_LABEL[cell.balance]}"
        ></div>
      {/each}
    </div>

    <div class="text-muted mt-3 flex flex-wrap items-center gap-3 text-xs">
      {#each LEGEND_VERDICTS as v (v)}
        <span class="flex items-center gap-1">
          <span class="h-3 w-3 rounded-sm" style="background: {VERDICT_COLOR[v]};"></span>
          {VERDICT_LABEL[v]}
        </span>
      {/each}
    </div>
    <div class="text-muted mt-1 flex flex-wrap items-center gap-3 text-xs">
      {#each LEGEND_BALANCES as b (b)}
        <span class="flex items-center gap-1">
          <span class="h-3 w-3 rounded-sm" style="background: {BALANCE_COLOR[b]};"></span>
          {BALANCE_LABEL[b]}
        </span>
      {/each}
    </div>
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Droplet, Salad, Footprints } from '@lucide/svelte';
  import { storage } from '$lib/storage';
  import { addDays, todayKey } from '$lib/date';
  import { profile } from '$state/profile.svelte';
  import { sumMacros } from '$lib/macros';
  import { personalizedDb } from '$state/personalizedDb';
  import { actualBurn, energyBalance, type BalanceState } from '$lib/energy';
  import { hydrationState, hydrationTarget, type HydrationState } from '$lib/hydration';
  import { STEP_TARGET } from '$state/activity.svelte';
  import type { DayActivity } from '$state/activity.svelte';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  const DAYS_30 = 30;
  const DAYS_7 = 7;
  const DELTA_CAP = 1000;

  type DayVerdict = 0 | 1 | 2 | 3;
  type BalanceVerdict = BalanceState | 'none';
  type HydrationVerdict = HydrationState | 'none';

  interface DayData {
    date: string;
    delta: number;
    balance: BalanceVerdict;
    waterMl: number;
    waterTarget: number;
    hydration: HydrationVerdict;
    steps: number;
    verdict: DayVerdict;
  }

  let days = $state<DayData[]>([]);
  let loaded = $state(false);

  const HYDRATION_BG: Record<HydrationVerdict, string> = {
    none: 'var(--color-border)',
    deficit: '#ef4444',
    balanced: '#86efac',
    surplus: '#60a5fa',
  };
  const VERDICT_BG: Record<DayVerdict, string> = {
    0: 'var(--color-border)',
    1: '#86efac',
    2: '#fbbf24',
    3: '#ef4444',
  };
  const VERDICT_LABEL: Record<DayVerdict, string> = {
    0: 'без даних',
    1: 'у межах норм',
    2: '1–2 перевищення',
    3: '3+ перевищень',
  };
  const HYDRATION_LABEL: Record<HydrationVerdict, string> = {
    none: 'без даних',
    deficit: 'нестача',
    balanced: 'норма',
    surplus: 'понад норму',
  };

  function categoryVerdict(entries: LogEntry[]): DayVerdict {
    if (entries.length === 0) return 0;
    const sums: Record<CategoryKey, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
    for (const e of entries) sums[e.cat] += e.pct;
    const overCount = Object.values(sums).filter((v) => v > 100).length;
    if (overCount === 0) return 1;
    if (overCount <= 2) return 2;
    return 3;
  }

  onMount(async () => {
    if (!profile.value) {
      loaded = true;
      return;
    }
    const today = todayKey();
    const target = hydrationTarget(profile.value);
    const dates = Array.from({ length: DAYS_30 }, (_, i) => addDays(today, -(DAYS_30 - 1 - i)));
    const p = profile.value;

    const next: DayData[] = await Promise.all(
      dates.map(async (date): Promise<DayData> => {
        const entries = await storage.load<LogEntry[]>(`log_${date}`, []);
        const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
          steps: 0,
          trainings: 0,
          waterMl: 0,
        });

        let delta = 0;
        let balance: BalanceVerdict = 'none';
        if (entries.length > 0) {
          const intake = sumMacros(entries, personalizedDb()).kcal;
          const burn = actualBurn(p, dayAct);
          const eb = energyBalance(intake, burn);
          delta = eb.delta;
          balance = eb.state;
        }

        const hydration: HydrationVerdict =
          dayAct.waterMl > 0 ? hydrationState(dayAct.waterMl, target) : 'none';
        const verdict = categoryVerdict(entries);

        return {
          date,
          delta,
          balance,
          waterMl: dayAct.waterMl,
          waterTarget: target,
          hydration,
          steps: dayAct.steps,
          verdict,
        };
      }),
    );

    days = next;
    loaded = true;
  });

  let last30 = $derived(days);
  let last7 = $derived(days.slice(-DAYS_7));

  function barOffsetPct(delta: number): number {
    return Math.min(Math.abs(delta) / DELTA_CAP, 1) * 50;
  }

  function fmtSigned(n: number): string {
    if (n === 0) return '0';
    return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
  }

  function stepFillPct(steps: number): number {
    return Math.min(100, Math.round((steps / STEP_TARGET) * 100));
  }

  function stepColor(steps: number): string {
    if (steps === 0) return 'var(--color-border)';
    if (steps >= STEP_TARGET) return 'var(--color-ok)';
    return 'var(--color-accent)';
  }

  function shortDate(iso: string): string {
    return iso.slice(5);
  }
</script>

<div class="border-border bg-surface-2 flex flex-col gap-4 rounded-xl border p-4">
  <!-- Hero: 30-day energy balance -->
  <section>
    <header class="mb-3 flex items-baseline justify-between gap-2">
      <h3 class="text-fg text-sm font-semibold">Енергобаланс • 30 днів</h3>
      <div class="text-muted text-[10px] font-semibold tracking-wider uppercase">Δ ккал/день</div>
    </header>

    {#if loaded}
      <div class="relative h-24">
        <div class="bg-border absolute inset-x-0 top-1/2 h-px"></div>

        <div class="grid h-full grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px]">
          {#each last30 as day, i (day.date)}
            {@const isToday = i === last30.length - 1}
            <div
              class="group relative flex h-full items-center justify-center"
              in:fade={{ duration: 240, delay: i * 12 }}
              title="{shortDate(day.date)}: {fmtSigned(day.delta)} ккал"
            >
              {#if day.balance === 'deficit'}
                <div
                  class="bg-accent absolute top-1/2 left-1/2 w-full max-w-[10px] -translate-x-1/2 rounded-sm transition-all"
                  style="height: {barOffsetPct(day.delta)}%;"
                ></div>
              {:else if day.balance === 'surplus'}
                <div
                  class="bg-warn absolute bottom-1/2 left-1/2 w-full max-w-[10px] -translate-x-1/2 rounded-sm transition-all"
                  style="height: {barOffsetPct(day.delta)}%;"
                ></div>
              {:else if day.balance === 'balanced'}
                <div
                  class="bg-muted absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                ></div>
              {:else}
                <div
                  class="bg-border absolute top-1/2 left-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                ></div>
              {/if}

              {#if isToday}
                <div
                  class="ring-fg/25 pointer-events-none absolute inset-0 rounded-sm ring-1"
                ></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="text-muted mt-2 flex items-center justify-between text-[10px]">
        <span>30 д тому</span>
        <span class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <span class="bg-accent h-2 w-2 rounded-sm"></span>дефіцит
          </span>
          <span class="flex items-center gap-1">
            <span class="bg-warn h-2 w-2 rounded-sm"></span>профіцит
          </span>
        </span>
        <span>сьогодні</span>
      </div>
    {:else}
      <div class="text-muted h-24 text-xs">Завантаження…</div>
    {/if}
  </section>

  <!-- 7-day strips: hydration / category verdict / steps -->
  {#if loaded && last7.length > 0}
    <section class="flex flex-col gap-2.5">
      <!-- Hydration -->
      <div class="flex items-center gap-3">
        <div class="flex w-20 shrink-0 items-center gap-1.5">
          <Droplet size={14} class="text-accent shrink-0" />
          <span class="text-fg text-xs font-semibold">Вода</span>
        </div>
        <div class="grid flex-1 grid-cols-7 gap-1">
          {#each last7 as day, i (day.date)}
            <div
              class="h-7 rounded-md transition-colors"
              style="background: {HYDRATION_BG[day.hydration]};"
              title="{shortDate(day.date)}: {day.waterMl}/{day.waterTarget} мл • {HYDRATION_LABEL[
                day.hydration
              ]}"
              in:fade={{ duration: 220, delay: 200 + i * 40 }}
            ></div>
          {/each}
        </div>
      </div>

      <!-- Category verdict -->
      <div class="flex items-center gap-3">
        <div class="flex w-20 shrink-0 items-center gap-1.5">
          <Salad size={14} class="text-accent shrink-0" />
          <span class="text-fg text-xs font-semibold">Категорії</span>
        </div>
        <div class="grid flex-1 grid-cols-7 gap-1">
          {#each last7 as day, i (day.date)}
            <div
              class="h-7 rounded-md transition-colors"
              style="background: {VERDICT_BG[day.verdict]};"
              title="{shortDate(day.date)}: {VERDICT_LABEL[day.verdict]}"
              in:fade={{ duration: 220, delay: 280 + i * 40 }}
            ></div>
          {/each}
        </div>
      </div>

      <!-- Steps -->
      <div class="flex items-center gap-3">
        <div class="flex w-20 shrink-0 items-center gap-1.5">
          <Footprints size={14} class="text-accent shrink-0" />
          <span class="text-fg text-xs font-semibold">Кроки</span>
        </div>
        <div class="grid flex-1 grid-cols-7 gap-1">
          {#each last7 as day, i (day.date)}
            <div
              class="bg-surface flex h-7 items-end overflow-hidden rounded-md"
              title="{shortDate(day.date)}: {day.steps} кроків"
              in:fade={{ duration: 220, delay: 360 + i * 40 }}
            >
              <div
                class="w-full transition-all duration-500"
                style="height: {stepFillPct(day.steps)}%; background: {stepColor(day.steps)};"
              ></div>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}
</div>

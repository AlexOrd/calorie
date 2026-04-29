<script lang="ts">
  import { HelpCircle, Image } from '@lucide/svelte';
  import DailyTotals from '../components/DailyTotals.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import BurnBreakdown from '../components/BurnBreakdown.svelte';
  import Heatmap from '../components/Heatmap.svelte';
  import CategoryBarChart from '../components/CategoryBarChart.svelte';
  import StatsHelpModal from '../components/StatsHelpModal.svelte';
  import WeeklyCardPreview from '../components/WeeklyCardPreview.svelte';
  import { hapticSelection, hapticImpact } from '$lib/haptics';
  import { storage } from '$lib/storage';
  import { addDays, isLogKey, todayKey } from '$lib/date';
  import { profile } from '$state/profile.svelte';
  import { sumMacros } from '$lib/macros';
  import { personalizedDb } from '$state/personalizedDb';
  import { actualBurn, energyBalance, NEUTRAL_BAND_KCAL } from '$lib/energy';
  import { hydrationTarget, isHydrationSevereDeficit } from '$lib/hydration';
  import { exportWeeklyCard, downloadBlob, type WeeklyCardData } from '$lib/weeklyCard';
  import { APP_VERSION } from '../data/changelog';
  import type { LogEntry } from '$types/log';
  import type { DayActivity } from '$state/activity.svelte';
  import type { CategoryKey } from '$types/food';

  let helpOpen = $state(false);
  let cardData = $state<WeeklyCardData | null>(null);
  let cardEl = $state<HTMLDivElement | undefined>(undefined);
  let exporting = $state(false);

  function openHelp(): void {
    hapticSelection();
    helpOpen = true;
  }

  async function buildCardData(): Promise<WeeklyCardData | null> {
    if (!profile.value) return null;
    const today = todayKey();
    const start = addDays(today, -6);

    const allKeys = await storage.keys();
    const logSet = new Set(allKeys.filter(isLogKey).map((k) => k.slice(4)));

    const target = hydrationTarget(profile.value);
    const perDayDelta: number[] = [];
    let totalDeltaKcal = 0;
    let deficitDays = 0;
    let waterTargetHits = 0;
    let cleanCategoryDays = 0;

    for (let i = 6; i >= 0; i--) {
      const date = addDays(today, -i);
      const hasLog = logSet.has(date);
      const entries = hasLog ? await storage.load<LogEntry[]>(`log_${date}`, []) : [];
      const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
        steps: 0,
        trainings: 0,
        waterMl: 0,
      });

      let delta = 0;
      if (entries.length > 0) {
        const intake = sumMacros(entries, personalizedDb()).kcal;
        const burn = actualBurn(profile.value, dayAct);
        const eb = energyBalance(intake, burn);
        delta = eb.delta;
        if (delta < -NEUTRAL_BAND_KCAL) deficitDays += 1;
      }
      perDayDelta.push(delta);
      totalDeltaKcal += delta;

      if (target > 0 && dayAct.waterMl >= target) waterTargetHits += 1;

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
      const severe = target > 0 && isHydrationSevereDeficit(dayAct.waterMl, target);
      if (entries.length > 0 && overCount === 0 && !severe) cleanCategoryDays += 1;
    }

    return {
      weekStartIso: start,
      weekEndIso: today,
      totalDeltaKcal: Math.round(totalDeltaKcal),
      perDayDelta,
      deficitDays,
      waterTargetHits,
      cleanCategoryDays,
      appVersion: APP_VERSION,
    };
  }

  async function saveCard(): Promise<void> {
    if (exporting) return;
    exporting = true;
    try {
      hapticImpact('light');
      cardData = await buildCardData();
      if (cardData === null) return;
      // Wait for the preview to render with the new data.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!cardEl) return;
      const blob = await exportWeeklyCard(cardEl);
      if (blob === null) return;
      downloadBlob(blob, `calorie-week-${cardData.weekEndIso}.png`);
    } finally {
      exporting = false;
    }
  }
</script>

<section class="flex flex-col gap-4 p-2 md:p-4">
  <EnergyBalanceRow variant="full" />

  <BurnBreakdown />

  <DailyTotals />

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <Heatmap />
    <CategoryBarChart />
  </div>

  <div class="flex flex-col items-center gap-2 pt-2">
    <button
      type="button"
      onclick={() => void saveCard()}
      disabled={exporting}
      class="text-fg border-border bg-surface-2 hover:bg-surface inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
    >
      <Image size={16} />
      {#if exporting}…{:else}Зберегти підсумок тижня{/if}
    </button>
    <button
      type="button"
      onclick={openHelp}
      class="text-muted hover:text-fg border-border bg-surface-2 mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors"
    >
      <HelpCircle size={16} />
      Як рахуються показники
    </button>
  </div>
</section>

<StatsHelpModal open={helpOpen} onClose={() => (helpOpen = false)} />

<div bind:this={cardEl} class="weekly-card-stage" aria-hidden="true">
  {#if cardData}
    <WeeklyCardPreview data={cardData} />
  {/if}
</div>

<style>
  .weekly-card-stage {
    position: fixed;
    left: -99999px;
    top: 0;
    pointer-events: none;
  }
</style>

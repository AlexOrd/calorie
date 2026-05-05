<script lang="ts">
  import { onMount } from 'svelte';
  import { History } from '@lucide/svelte';
  import { activeDate } from '$state/activeDate.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { categoryConsumed } from '$state/dailyLog.svelte';
  import { changelogState } from '$state/changelog.svelte';
  import { profile } from '$state/profile.svelte';
  import { storage } from '$lib/storage';
  import { sumMacros } from '$lib/macros';
  import { actualBurn, energyBalance } from '$lib/energy';
  import { hydrationTarget } from '$lib/hydration';
  import { hapticSelection } from '$lib/haptics';
  import { CATEGORY_KEYS } from '$types/food';
  import { changelog, APP_VERSION } from '../data/changelog';
  import { cmpVersion } from '$lib/version';
  import { lastWeekTally } from '$lib/streaks';
  import { addDays, todayKey } from '$lib/date';
  import { STEP_TARGET } from '$state/activity.svelte';
  import type { ChangelogItem } from '$types/changelog';
  import type { DayActivity } from '$types/activity';
  import type { LogEntry } from '$types/log';
  import CategoryCard from '../components/CategoryCard.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import EntrySheet from '../components/EntrySheet.svelte';
  import InstallBanner from '../components/InstallBanner.svelte';
  import StreaksRow from '../components/StreaksRow.svelte';
  import PreviousDaySummaryModal from '../components/PreviousDaySummaryModal.svelte';
  import WhatsNewModal from '../components/WhatsNewModal.svelte';
  import WeeklyMilestoneModal, {
    type MilestoneBadge,
  } from '../components/WeeklyMilestoneModal.svelte';
  import type { CategoryKey } from '$types/food';
  import type { DayRecapSummary, RecapEntry } from '$types/recap';

  const RECAP_SHOWN_KEY_PREFIX = 'daily_recap_shown_';
  const EMPTY_ACTIVITY: DayActivity = { steps: 0, trainings: 0, waterMl: 0 };

  let sheetOpen = $state(false);
  let activeCat = $state<CategoryKey | null>(null);

  let whatsNewOpen = $state(false);
  let whatsNewItems = $state<readonly ChangelogItem[]>([]);
  let triggerFired = false;

  let milestoneOpen = $state(false);
  let milestoneBadges = $state<readonly MilestoneBadge[]>([]);

  let recapOpen = $state(false);
  let recapSummary = $state<DayRecapSummary | null>(null);
  let recapBusy = $state(false);

  let recapButtonDisabled = $derived(recapBusy || activeDate.value >= todayKey());

  function openSheet(key: CategoryKey): void {
    activeCat = key;
    sheetOpen = true;
  }

  function isoWeekId(iso: string): string {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const d = new Date(`${iso}T00:00:00Z`);
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    const weekNum = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }

  async function maybeFireMilestone(): Promise<void> {
    if (!profile.value) return;
    const todayDate = new Date(`${todayKey()}T00:00:00Z`);
    if (todayDate.getUTCDay() !== 1) return; // only on Monday after the just-completed week
    const weekId = isoWeekId(addDays(todayKey(), -1));
    const stored = await storage.load<string | null>('last_celebrated_week', null);
    if (stored === weekId) return;

    const tally = await lastWeekTally(profile.value);
    const badges: MilestoneBadge[] = [];
    if (tally.deficitDays >= 5) {
      badges.push({
        kind: 'deficit',
        title: 'Тиждень дефіциту',
        body: `${tally.deficitDays} днів у дефіциті — впевнений курс.`,
      });
    }
    if (tally.waterTargetHits >= 7) {
      badges.push({
        kind: 'water',
        title: 'Гідрований тиждень',
        body: 'Ціль по воді щодня.',
      });
    }
    if (tally.cleanCategoryDays >= 7) {
      badges.push({
        kind: 'category',
        title: 'Чисті категорії',
        body: 'Тиждень без перевищень.',
      });
    }

    if (badges.length === 0) {
      await storage.save('last_celebrated_week', weekId);
      return;
    }

    milestoneBadges = badges;
    milestoneOpen = true;
    await storage.save('last_celebrated_week', weekId);
  }

  function closeMilestone(): void {
    milestoneOpen = false;
  }

  function recapShownKey(date: string): string {
    return `${RECAP_SHOWN_KEY_PREFIX}${date}`;
  }

  async function buildRecap(date: string): Promise<DayRecapSummary | null> {
    const p = profile.value;
    if (!p) return null;

    const [entries, dayActivity] = await Promise.all([
      storage.load<LogEntry[]>(`log_${date}`, []),
      storage.load<DayActivity>(`activity_${date}`, { ...EMPTY_ACTIVITY }),
    ]);

    const db = personalizedDb();
    const totals = sumMacros(entries, db);
    const burn = actualBurn(p, dayActivity);
    const balance = energyBalance(totals.kcal, burn);

    const visibleEntries = entries
      .map((entry): RecapEntry | null => {
        const item = db[entry.cat]?.items[entry.id];
        if (!item) return null;
        const amount = Math.round((item.max_g * entry.pct) / 100);
        return {
          id: entry.id,
          cat: entry.cat,
          name: item.name,
          pct: entry.pct,
          ts: entry.ts,
          amount,
          unit: item.unit ?? 'г',
        };
      })
      .filter((entry): entry is RecapEntry => entry !== null);

    const categorySums: Record<CategoryKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
      G: 0,
      H: 0,
    };
    for (const entry of entries) categorySums[entry.cat] += entry.pct;

    let overCategoryCount = 0;
    for (const key of CATEGORY_KEYS) {
      if (categorySums[key] > 100) overCategoryCount += 1;
    }

    const hasAnyData =
      visibleEntries.length > 0 ||
      dayActivity.steps > 0 ||
      dayActivity.trainings > 0 ||
      dayActivity.waterMl > 0;

    return {
      date,
      entries: visibleEntries,
      activity: dayActivity,
      totals,
      intakeKcal: Math.round(totals.kcal),
      burnKcal: Math.round(burn),
      deltaKcal: Math.round(balance.delta),
      balanceState: balance.state,
      waterTargetMl: hydrationTarget(p),
      overCategoryCount,
      hasAnyData,
    };
  }

  async function maybeOpenPreviousDayRecap(): Promise<void> {
    const previousDay = addDays(todayKey(), -1);
    const alreadyShown = await storage.load<boolean>(recapShownKey(previousDay), false);
    if (alreadyShown) return;

    const summary = await buildRecap(previousDay);
    if (!summary || !summary.hasAnyData) return;

    recapSummary = summary;
    recapOpen = true;
    await storage.save(recapShownKey(previousDay), true);
  }

  async function openRecapForDate(date: string): Promise<void> {
    if (date >= todayKey()) return;
    recapBusy = true;
    const summary = await buildRecap(date);
    recapBusy = false;
    if (!summary) return;
    hapticSelection();
    recapSummary = summary;
    recapOpen = true;
  }

  function closeRecap(): void {
    recapOpen = false;
  }

  onMount(async () => {
    if (triggerFired) return;
    triggerFired = true;
    if (!changelogState.isLoaded) return;

    const stored = changelogState.lastShownVersion;
    if (stored === null) {
      await changelogState.seedFirstLaunch();
    } else if (cmpVersion(stored, APP_VERSION) < 0) {
      const newer = changelog.filter((e) => cmpVersion(e.version, stored) > 0);
      const items = newer.flatMap((e) => e.items).filter((i) => i.type !== 'fix');
      if (items.length === 0) {
        await changelogState.markSeen();
      } else {
        whatsNewItems = items;
        whatsNewOpen = true;
      }
    }

    void maybeFireMilestone();
    void maybeOpenPreviousDayRecap();
  });

  async function closeWhatsNew(): Promise<void> {
    whatsNewOpen = false;
    await changelogState.markSeen();
  }

  let recapButtonLabel = $derived(
    activeDate.value >= todayKey()
      ? 'Підсумок доступний після завершення дня'
      : `Відкрити підсумок за ${activeDate.value}`,
  );

  let stepsHit = $derived(recapSummary ? recapSummary.activity.steps >= STEP_TARGET : false);
</script>

<section class="flex flex-col gap-3 p-2 md:p-4">
  <InstallBanner />
  <StreaksRow />

  <EnergyBalanceRow />

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
    {#each CATEGORY_KEYS as key (key)}
      <CategoryCard
        categoryKey={key}
        title={personalizedDb()[key].title}
        color={personalizedDb()[key].color}
        consumed={categoryConsumed()[key]}
        onClick={openSheet}
      />
    {/each}
  </div>

  <div class="flex items-center justify-center pt-1 pb-2">
    <button
      type="button"
      class="border-border bg-surface-2 text-muted hover:text-fg inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      onclick={() => void openRecapForDate(activeDate.value)}
      disabled={recapButtonDisabled}
      aria-label={recapButtonLabel}
      title={recapButtonLabel}
    >
      <History size={14} class={stepsHit ? 'text-ok' : 'text-accent'} />
      <span>Підсумок дня</span>
    </button>
  </div>
</section>

<EntrySheet bind:open={sheetOpen} categoryKey={activeCat} />
<PreviousDaySummaryModal open={recapOpen} summary={recapSummary} onClose={closeRecap} />
<WhatsNewModal open={whatsNewOpen} items={whatsNewItems} onClose={closeWhatsNew} />
<WeeklyMilestoneModal open={milestoneOpen} badges={milestoneBadges} onClose={closeMilestone} />

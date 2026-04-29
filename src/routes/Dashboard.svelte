<script lang="ts">
  import { onMount } from 'svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { categoryConsumed } from '$state/dailyLog.svelte';
  import { changelogState } from '$state/changelog.svelte';
  import { profile } from '$state/profile.svelte';
  import { storage } from '$lib/storage';
  import { CATEGORY_KEYS } from '$types/food';
  import { changelog, APP_VERSION } from '../data/changelog';
  import { cmpVersion } from '$lib/version';
  import { lastWeekTally } from '$lib/streaks';
  import { addDays, todayKey } from '$lib/date';
  import type { ChangelogItem } from '$types/changelog';
  import CategoryCard from '../components/CategoryCard.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import EntrySheet from '../components/EntrySheet.svelte';
  import InstallBanner from '../components/InstallBanner.svelte';
  import StreaksRow from '../components/StreaksRow.svelte';
  import DailySummaryCard from '../components/DailySummaryCard.svelte';
  import WhatsNewModal from '../components/WhatsNewModal.svelte';
  import WeeklyMilestoneModal, {
    type MilestoneBadge,
  } from '../components/WeeklyMilestoneModal.svelte';
  import type { CategoryKey } from '$types/food';

  let sheetOpen = $state(false);
  let activeCat = $state<CategoryKey | null>(null);

  let whatsNewOpen = $state(false);
  let whatsNewItems = $state<readonly ChangelogItem[]>([]);
  let triggerFired = false;

  let milestoneOpen = $state(false);
  let milestoneBadges = $state<readonly MilestoneBadge[]>([]);

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
  });

  async function closeWhatsNew(): Promise<void> {
    whatsNewOpen = false;
    await changelogState.markSeen();
  }
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

  <DailySummaryCard />
</section>

<EntrySheet bind:open={sheetOpen} categoryKey={activeCat} />
<WhatsNewModal open={whatsNewOpen} items={whatsNewItems} onClose={closeWhatsNew} />
<WeeklyMilestoneModal open={milestoneOpen} badges={milestoneBadges} onClose={closeMilestone} />

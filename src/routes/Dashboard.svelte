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
  import { computeStreaks } from '$lib/streaks';
  import { addDays, todayKey } from '$lib/date';
  import type { ChangelogItem } from '$types/changelog';
  import CategoryCard from '../components/CategoryCard.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import EntrySheet from '../components/EntrySheet.svelte';
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

  // Tomohiko Sakamoto lookup table — index 0..11 maps month 1..12
  const DOW_T: readonly number[] = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];

  /** ISO week string (e.g. "2026-W17") from a YYYY-MM-DD key, no Date objects. */
  function isoWeekId(iso: string): string {
    const [y, mo, d] = iso.split('-').map(Number) as [number, number, number];
    // Tomohiko Sakamoto — day of week (0=Sun,1=Mon,…6=Sat)
    const yy = mo < 3 ? y - 1 : y;
    const dow =
      (yy +
        Math.floor(yy / 4) -
        Math.floor(yy / 100) +
        Math.floor(yy / 400) +
        (DOW_T[mo - 1] ?? 0) +
        d) %
      7;
    // ISO week: move to Thursday of the same week (isoDay 1=Mon,…4=Thu)
    const isoDow = dow === 0 ? 7 : dow; // 1=Mon…7=Sun
    // Days since Monday of this week
    const monOffset = isoDow - 1;
    // Julian Day Number of this date (Gregorian)
    function jdn(yr: number, m: number, dd: number): number {
      return (
        Math.floor((1461 * (yr + 4800 + Math.floor((m - 14) / 12))) / 4) +
        Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
        Math.floor((3 * Math.floor((yr + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
        dd -
        32075
      );
    }
    const thuJdn = jdn(y, mo, d) - monOffset + 3; // Thursday JDN
    // Year of Thursday
    // Reverse JDN → Gregorian year (approximate: find year whose Jan 4 JDN ≤ thuJdn)
    const thuApproxYear = Math.floor((thuJdn - 1721119.5) / 365.2425);
    const thuYear = jdn(thuApproxYear + 1, 1, 4) <= thuJdn ? thuApproxYear + 1 : thuApproxYear;
    // Week number = (thuJdn - JDN of Jan 4 of thuYear's week-1 Monday) / 7 + 1
    const jan4Jdn = jdn(thuYear, 1, 4);
    const jan4Dow = (jan4Jdn + 1) % 7 || 7; // 1=Mon…7=Sun (JDN 0 = Monday)
    const w1MonJdn = jan4Jdn - (jan4Dow - 1);
    const weekNum = Math.floor((thuJdn - w1MonJdn) / 7) + 1;
    return `${thuYear}-W${weekNum.toString().padStart(2, '0')}`;
  }

  async function maybeFireMilestone(): Promise<void> {
    if (!profile.value) return;
    const today = todayKey();
    // Day of week without new Date(): Tomohiko Sakamoto
    const [y, mo, d] = today.split('-').map(Number) as [number, number, number];
    const yy = mo < 3 ? y - 1 : y;
    const jsDay =
      (yy +
        Math.floor(yy / 4) -
        Math.floor(yy / 100) +
        Math.floor(yy / 400) +
        (DOW_T[mo - 1] ?? 0) +
        d) %
      7;
    if (jsDay !== 1) return; // only on Monday after the just-completed week
    const weekId = isoWeekId(addDays(todayKey(), -1));
    const stored = await storage.load<string | null>('last_celebrated_week', null);
    if (stored === weekId) return;

    const stats = await computeStreaks(profile.value);
    const badges: MilestoneBadge[] = [];
    if (stats.deficit.current >= 5 || stats.deficit.best >= 5) {
      badges.push({
        kind: 'deficit',
        title: 'Тиждень дефіциту',
        body: '5+ днів у дефіциті — впевнений курс.',
      });
    }
    if (stats.water.current >= 7 || stats.water.best >= 7) {
      badges.push({
        kind: 'water',
        title: 'Гідрований тиждень',
        body: 'Ціль по воді щодня.',
      });
    }
    if (stats.category.current >= 7 || stats.category.best >= 7) {
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

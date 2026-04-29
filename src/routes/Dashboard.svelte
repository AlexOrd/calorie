<script lang="ts">
  import { onMount } from 'svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { categoryConsumed } from '$state/dailyLog.svelte';
  import { changelogState } from '$state/changelog.svelte';
  import { CATEGORY_KEYS } from '$types/food';
  import { changelog, APP_VERSION } from '../data/changelog';
  import { cmpVersion } from '$lib/version';
  import type { ChangelogItem } from '$types/changelog';
  import CategoryCard from '../components/CategoryCard.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import EntrySheet from '../components/EntrySheet.svelte';
  import WhatsNewModal from '../components/WhatsNewModal.svelte';
  import type { CategoryKey } from '$types/food';

  let sheetOpen = $state(false);
  let activeCat = $state<CategoryKey | null>(null);

  let whatsNewOpen = $state(false);
  let whatsNewItems = $state<readonly ChangelogItem[]>([]);
  let triggerFired = false;

  function openSheet(key: CategoryKey): void {
    activeCat = key;
    sheetOpen = true;
  }

  onMount(async () => {
    if (triggerFired) return;
    triggerFired = true;
    if (!changelogState.isLoaded) return;

    const stored = changelogState.lastShownVersion;
    if (stored === null) {
      await changelogState.seedFirstLaunch();
      return;
    }
    if (cmpVersion(stored, APP_VERSION) >= 0) return;

    const newer = changelog.filter((e) => cmpVersion(e.version, stored) > 0);
    const items = newer.flatMap((e) => e.items).filter((i) => i.type !== 'fix');
    if (items.length === 0) {
      await changelogState.markSeen();
      return;
    }

    whatsNewItems = items;
    whatsNewOpen = true;
  });

  async function closeWhatsNew(): Promise<void> {
    whatsNewOpen = false;
    await changelogState.markSeen();
  }
</script>

<section class="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:grid-cols-4 md:gap-4 md:p-4">
  <div class="col-span-1 sm:col-span-2 md:col-span-4">
    <EnergyBalanceRow />
  </div>
  {#each CATEGORY_KEYS as key (key)}
    <CategoryCard
      categoryKey={key}
      title={personalizedDb()[key].title}
      color={personalizedDb()[key].color}
      consumed={categoryConsumed()[key]}
      onClick={openSheet}
    />
  {/each}
</section>

<EntrySheet bind:open={sheetOpen} categoryKey={activeCat} />
<WhatsNewModal open={whatsNewOpen} items={whatsNewItems} onClose={closeWhatsNew} />

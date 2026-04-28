<script lang="ts">
  import { personalizedDb } from '$state/personalizedDb';
  import { categoryConsumed } from '$state/dailyLog.svelte';
  import { CATEGORY_KEYS } from '$types/food';
  import CategoryCard from '../components/CategoryCard.svelte';
  import EntrySheet from '../components/EntrySheet.svelte';
  import type { CategoryKey } from '$types/food';

  let sheetOpen = $state(false);
  let activeCat = $state<CategoryKey | null>(null);

  function openSheet(key: CategoryKey): void {
    activeCat = key;
    sheetOpen = true;
  }
</script>

<section class="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:grid-cols-4 md:gap-4 md:p-4">
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

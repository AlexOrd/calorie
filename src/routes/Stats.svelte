<script lang="ts">
  import { HelpCircle } from '@lucide/svelte';
  import DailyTotals from '../components/DailyTotals.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import BurnBreakdown from '../components/BurnBreakdown.svelte';
  import Heatmap from '../components/Heatmap.svelte';
  import CategoryBarChart from '../components/CategoryBarChart.svelte';
  import StatsHelpModal from '../components/StatsHelpModal.svelte';
  import { hapticSelection } from '$lib/haptics';

  let helpOpen = $state(false);

  function openHelp(): void {
    hapticSelection();
    helpOpen = true;
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
      onclick={openHelp}
      class="text-muted hover:text-fg border-border bg-surface-2 mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors"
    >
      <HelpCircle size={16} />
      Як рахуються показники
    </button>
  </div>
</section>

<StatsHelpModal open={helpOpen} onClose={() => (helpOpen = false)} />

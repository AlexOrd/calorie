<script lang="ts">
  import DailyTotals from '../components/DailyTotals.svelte';
  import Heatmap from '../components/Heatmap.svelte';
  import CategoryBarChart from '../components/CategoryBarChart.svelte';
</script>

<section class="flex flex-col gap-4 p-2 md:p-4">
  <DailyTotals />
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <Heatmap />
    <CategoryBarChart />
  </div>
</section>

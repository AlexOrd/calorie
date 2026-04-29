<script lang="ts">
  import DailyTotals from '../components/DailyTotals.svelte';
  import EnergyBalanceRow from '../components/EnergyBalanceRow.svelte';
  import Heatmap from '../components/Heatmap.svelte';
  import CategoryBarChart from '../components/CategoryBarChart.svelte';
  import StatTip from '../components/StatTip.svelte';
</script>

<section class="flex flex-col gap-4 p-2 md:p-4">
  <EnergyBalanceRow variant="full" />

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <StatTip title="Що таке BMI">
      Індекс маси тіла. <code class="bg-surface rounded px-1">BMI = вага / зріст²</code>
      (зріст у метрах). Норма 18.5–24.9. WHO використовує BMI як базовий скринінговий показник для дорослих.
    </StatTip>

    <StatTip title="Що таке BMR">
      Калорії, які тіло спалює у спокої за добу — твоя метаболічна підлога. Формула Mifflin-St Jeor:
      <code class="bg-surface mt-1 block rounded px-1 py-0.5 text-xs">
        10·вага + 6.25·зріст − 5·вік + (5 ♂ / −161 ♀)
      </code>
    </StatTip>

    <StatTip title="Що таке TDEE">
      BMR помножений на множник активності — твоя добова норма для підтримки ваги.
      <code class="bg-surface mt-1 block rounded px-1 py-0.5 text-xs">
        TDEE = BMR × {1.2}/{1.375}/{1.55}/{1.725}
      </code>
    </StatTip>

    <StatTip title="Енергобаланс">
      Спожито мінус спалено. Зелена зона ±100 ккал — у межах похибки. Дефіцит → схуднення, профіцит
      → набір.
      <code class="bg-surface mt-1 block rounded px-1 py-0.5 text-xs">
        delta = intake − (BMR + step_kcal + training_kcal)
      </code>
    </StatTip>

    <StatTip title="Гідрація">
      Ціль на основі ваги: 30 мл × кг, мінімум 2.0 л (♀) / 2.5 л (♂). Нестача &lt; 50 % від цілі
      додає страйк до денного вердикту.
    </StatTip>

    <StatTip title="Кольори календаря">
      Зелений: усі категорії ≤ 100 %. Жовтий: 1–2 перевищення. Червоний: 3+. Сильна нестача гідрації
      (&lt; 50 % від цілі) додає один страйк до загальної кількості.
    </StatTip>
  </div>

  <DailyTotals />
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <Heatmap />
    <CategoryBarChart />
  </div>
</section>

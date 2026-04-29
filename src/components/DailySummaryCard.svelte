<script lang="ts">
  import { TrendingDown, TrendingUp, Equal, Droplet, Sparkles } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { activity } from '$state/activity.svelte';
  import { dailyLog, categoryConsumed } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { sumMacros } from '$lib/macros';
  import { actualBurn, energyBalance } from '$lib/energy';
  import { hydrationTarget } from '$lib/hydration';
  import { CATEGORY_KEYS, type CategoryKey } from '$types/food';

  let balance = $derived.by(() => {
    if (!profile.value) return null;
    const intake = sumMacros(dailyLog.entries, personalizedDb()).kcal;
    const burn = actualBurn(profile.value, activity.value);
    return energyBalance(intake, burn);
  });

  let waterPct = $derived.by(() => {
    if (!profile.value) return 0;
    const target = hydrationTarget(profile.value);
    if (target <= 0) return 0;
    return Math.min(100, Math.round((activity.value.waterMl / target) * 100));
  });

  let topCategory = $derived.by<{ key: CategoryKey; pct: number; title: string } | null>(() => {
    const consumed = categoryConsumed();
    let bestKey: CategoryKey | null = null;
    let bestPct = 0;
    for (const key of CATEGORY_KEYS) {
      const pct = consumed[key];
      if (pct > bestPct) {
        bestPct = pct;
        bestKey = key;
      }
    }
    if (bestKey === null) return null;
    return { key: bestKey, pct: Math.round(bestPct), title: personalizedDb()[bestKey].title };
  });

  let entryCount = $derived(dailyLog.entries.length);

  function fmtSigned(n: number): string {
    if (n === 0) return '0';
    return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
  }
</script>

{#if balance}
  {@const Icon =
    balance.state === 'deficit' ? TrendingDown : balance.state === 'surplus' ? TrendingUp : Equal}
  {@const fg =
    balance.state === 'deficit'
      ? 'text-accent'
      : balance.state === 'surplus'
        ? 'text-warn'
        : 'text-muted'}

  <div class="border-border bg-surface-2 flex flex-col gap-2 rounded-xl border p-4">
    <div class="flex items-center gap-2">
      <Sparkles size={16} class="text-accent" />
      <h3 class="text-fg text-sm font-semibold">Підсумок дня</h3>
    </div>

    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <span class="flex items-center gap-1.5">
        <Icon size={14} class={fg} />
        <span class={['font-semibold tabular-nums', fg]}>{fmtSigned(balance.delta)} ккал</span>
      </span>
      {#if waterPct > 0}
        <span class="text-muted flex items-center gap-1.5">
          <Droplet size={14} class="text-accent" />
          <span class="text-fg tabular-nums">{waterPct}%</span>
        </span>
      {/if}
      <span class="text-muted text-xs tabular-nums">
        {entryCount}
        {#if entryCount === 1}запис{:else if entryCount >= 2 && entryCount <= 4}записи{:else}записів{/if}
      </span>
    </div>

    {#if topCategory && topCategory.pct > 0}
      <p class="text-muted text-xs">
        Найбільше:
        <span class="text-fg/90">{topCategory.title}</span>
        <span class="tabular-nums">· {topCategory.pct}%</span>
      </p>
    {/if}
  </div>
{/if}

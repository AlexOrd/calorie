<script lang="ts">
  import { TrendingDown, TrendingUp, Equal } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { activity } from '$state/activity.svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { sumMacros } from '$lib/macros';
  import { actualBurn, energyBalance, type BalanceState } from '$lib/energy';

  interface Props {
    variant?: 'compact' | 'full';
  }
  let { variant = 'compact' }: Props = $props();

  let balance = $derived.by(() => {
    if (!profile.value) return null;
    const intake = sumMacros(dailyLog.entries, personalizedDb()).kcal;
    const burn = actualBurn(profile.value, activity.value);
    return energyBalance(intake, burn);
  });

  const STATE_CLASSES: Record<BalanceState, { wrap: string; fg: string; bar: string }> = {
    deficit: {
      wrap: 'bg-accent/10 border-accent/20',
      fg: 'text-accent',
      bar: 'bg-accent',
    },
    balanced: {
      wrap: 'bg-surface-2 border-border',
      fg: 'text-muted',
      bar: 'bg-muted',
    },
    surplus: {
      wrap: 'bg-warn/10 border-warn/30',
      fg: 'text-warn',
      bar: 'bg-warn',
    },
  };

  const STATE_LABEL: Record<BalanceState, string> = {
    deficit: 'Дефіцит',
    balanced: 'Баланс',
    surplus: 'Профіцит',
  };

  function fmtSigned(n: number): string {
    if (n === 0) return '0';
    return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
  }

  // Mini-bar fills proportionally, capped at 500 kcal magnitude.
  function barWidthPct(delta: number): number {
    return Math.min(Math.abs(delta) / 500, 1) * 100;
  }
</script>

{#if balance}
  {@const cls = STATE_CLASSES[balance.state]}
  {@const Icon =
    balance.state === 'deficit' ? TrendingDown : balance.state === 'surplus' ? TrendingUp : Equal}

  {#if variant === 'compact'}
    <div
      class={[
        'flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
        cls.wrap,
      ]}
    >
      <Icon size={20} class={cls.fg} />
      <span class={['text-2xl font-bold tabular-nums', cls.fg]}>
        {fmtSigned(balance.delta)}
      </span>
      <span class="text-muted text-xs">ккал</span>
      <div class="bg-surface-2/60 ml-auto flex h-1.5 w-24 overflow-hidden rounded-full">
        <div class="flex w-1/2 justify-end">
          {#if balance.delta < 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
        <div class="flex w-1/2 justify-start">
          {#if balance.delta > 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div
      class={[
        'flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        cls.wrap,
      ]}
    >
      <Icon size={22} class={cls.fg} />
      <span class={['text-base font-semibold', cls.fg]}>{STATE_LABEL[balance.state]}</span>
      <span class={['text-2xl font-bold tabular-nums', cls.fg]}>
        {fmtSigned(balance.delta)}
      </span>
      <span class="text-muted text-xs">ккал</span>
      <div class="bg-surface-2/60 mx-2 flex h-2 w-40 overflow-hidden rounded-full">
        <div class="flex w-1/2 justify-end">
          {#if balance.delta < 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
        <div class="flex w-1/2 justify-start">
          {#if balance.delta > 0}
            <div
              class={['h-full rounded-full', cls.bar]}
              style="width: {barWidthPct(balance.delta)}%;"
            ></div>
          {/if}
        </div>
      </div>
      <span class="text-muted ml-auto text-sm tabular-nums">
        {balance.intake} / {balance.burn} ккал
      </span>
    </div>
  {/if}
{/if}

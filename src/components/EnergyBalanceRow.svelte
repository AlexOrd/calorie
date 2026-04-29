<script lang="ts">
  import {
    TrendingDown,
    TrendingUp,
    Equal,
    Droplet,
    Activity as ActivityIcon,
  } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { activity } from '$state/activity.svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { sumMacros } from '$lib/macros';
  import { actualBurn, energyBalance, type BalanceState } from '$lib/energy';
  import { hydrationTarget } from '$lib/hydration';
  import { bmi } from '$lib/health';

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

  let waterTargetMl = $derived(profile.value ? hydrationTarget(profile.value) : 0);
  let waterMl = $derived(activity.value.waterMl);

  let bmiValue = $derived(profile.value ? bmi(profile.value.weight, profile.value.height) : null);

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

  function barWidthPct(delta: number): number {
    return Math.min(Math.abs(delta) / 500, 1) * 100;
  }

  function fmtLitres(ml: number): string {
    return (ml / 1000).toFixed(ml % 1000 === 0 ? 1 : 2);
  }
</script>

{#if balance}
  {@const cls = STATE_CLASSES[balance.state]}
  {@const Icon =
    balance.state === 'deficit' ? TrendingDown : balance.state === 'surplus' ? TrendingUp : Equal}

  {#if variant === 'compact'}
    <div class="flex flex-wrap items-center gap-2">
      <div
        class={[
          'flex min-h-12 flex-1 items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
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

      {#if waterTargetMl > 0}
        <div
          class="bg-surface-2 border-border text-muted flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-sm tabular-nums"
        >
          <Droplet size={16} class="text-accent" />
          {fmtLitres(waterMl)} / {fmtLitres(waterTargetMl)} л
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex flex-wrap items-center gap-2">
      {#if bmiValue !== null}
        <div
          class="bg-surface-2 border-border flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums"
        >
          <ActivityIcon size={16} class="text-accent" />
          BMI {bmiValue.toFixed(1)}
        </div>
      {/if}

      <div
        class={[
          'flex flex-1 flex-wrap items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
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

      {#if waterTargetMl > 0}
        <div
          class="bg-surface-2 border-border text-muted flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-sm tabular-nums"
        >
          <Droplet size={16} class="text-accent" />
          {fmtLitres(waterMl)} / {fmtLitres(waterTargetMl)} л
        </div>
      {/if}
    </div>
  {/if}
{/if}

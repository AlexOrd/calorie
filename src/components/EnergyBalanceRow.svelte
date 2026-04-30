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
  import { bmi, bmiClass } from '$lib/health';
  import { bodyFatPct, type BodyFatInputs } from '$lib/bodyfat';

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
  let waterPct = $derived(
    waterTargetMl > 0 ? Math.min(100, Math.round((waterMl / waterTargetMl) * 100)) : 0,
  );

  let bmiValue = $derived(profile.value ? bmi(profile.value.weight, profile.value.height) : null);
  let bmiCls = $derived(bmiValue !== null ? bmiClass(bmiValue) : null);
  let bfValue = $derived.by<number | null>(() => {
    if (!profile.value) return null;
    const p = profile.value;
    if (p.waist_cm === undefined || p.neck_cm === undefined) return null;
    const inputs: BodyFatInputs = {
      gender: p.gender,
      heightCm: p.height,
      waistCm: p.waist_cm,
      neckCm: p.neck_cm,
      ...(p.hip_cm !== undefined ? { hipCm: p.hip_cm } : {}),
    };
    return bodyFatPct(inputs);
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

  const BMI_CLASS_FG: Record<'underweight' | 'healthy' | 'overweight' | 'obese', string> = {
    underweight: 'text-muted',
    healthy: 'text-ok',
    overweight: 'text-warn',
    obese: 'text-accent',
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
    <div class="grid grid-cols-2 gap-2">
      <!-- Calories card -->
      <div class={['flex flex-col gap-1.5 rounded-xl border p-3 transition-colors', cls.wrap]}>
        <div class="flex items-center gap-1.5">
          <Icon size={14} class={cls.fg} />
          <span class={['text-[10px] font-semibold tracking-wider uppercase', cls.fg]}>
            {STATE_LABEL[balance.state]}
          </span>
        </div>
        <div class={['text-xl leading-tight font-bold tabular-nums', cls.fg]}>
          {fmtSigned(balance.delta)}
          <span class="text-muted text-xs font-normal">ккал</span>
        </div>
        <div class="bg-surface/60 mt-auto flex h-1.5 w-full overflow-hidden rounded-full">
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

      <!-- Water card -->
      {#if waterTargetMl > 0}
        <div class="bg-surface-2 border-border flex flex-col gap-1.5 rounded-xl border p-3">
          <div class="flex items-center gap-1.5">
            <Droplet size={14} class="text-accent" />
            <span class="text-muted text-[10px] font-semibold tracking-wider uppercase">
              Вода {waterPct}%
            </span>
          </div>
          <div class="text-fg text-xl leading-tight font-bold tabular-nums">
            {fmtLitres(waterMl)}
            <span class="text-muted text-xs font-normal">/ {fmtLitres(waterTargetMl)} л</span>
          </div>
          <div class="bg-surface/60 mt-auto h-1.5 w-full overflow-hidden rounded-full">
            <div
              class="bg-accent h-full rounded-full transition-[width] duration-300"
              style="width: {Math.min(100, waterPct)}%;"
            ></div>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <!-- Hero balance card -->
      <div class={['flex flex-col gap-3 rounded-2xl border p-4 transition-colors', cls.wrap]}>
        <div class="flex items-center gap-3">
          <Icon size={26} class={cls.fg} />
          <span class={['text-base font-semibold', cls.fg]}>{STATE_LABEL[balance.state]}</span>
          <span class={['ml-auto text-3xl font-bold tabular-nums', cls.fg]}>
            {fmtSigned(balance.delta)}
            <span class="text-muted text-sm font-normal">ккал</span>
          </span>
        </div>

        <div class="bg-surface/60 flex h-2 w-full overflow-hidden rounded-full">
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

        <div class="text-muted flex items-center justify-between text-xs tabular-nums">
          <span>Спожито: <span class="text-fg">{balance.intake}</span> ккал</span>
          <span>Спалено: <span class="text-fg">{balance.burn}</span> ккал</span>
        </div>
      </div>

      <!-- Sub-stats: BMI + Body Fat + Water -->
      {#if bmiValue !== null || waterTargetMl > 0 || bfValue !== null}
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {#if bmiValue !== null && bmiCls !== null}
            <div
              class="bg-surface-2 border-border flex items-center gap-2 rounded-xl border px-3 py-2 last:[&:nth-child(odd)]:col-span-2 sm:last:[&:nth-child(odd)]:col-span-1"
            >
              <ActivityIcon size={18} class={BMI_CLASS_FG[bmiCls]} />
              <div class="flex flex-col">
                <span class="text-muted text-[10px] font-semibold tracking-wider uppercase"
                  >BMI</span
                >
                <span
                  class={['text-base leading-tight font-bold tabular-nums', BMI_CLASS_FG[bmiCls]]}
                >
                  {bmiValue.toFixed(1)}
                </span>
              </div>
            </div>
          {/if}

          {#if bfValue !== null}
            <div
              class="bg-surface-2 border-border flex items-center gap-2 rounded-xl border px-3 py-2 last:[&:nth-child(odd)]:col-span-2 sm:last:[&:nth-child(odd)]:col-span-1"
            >
              <ActivityIcon size={18} class="text-warn" />
              <div class="flex flex-col">
                <span class="text-muted text-[10px] font-semibold tracking-wider uppercase"
                  >Жир</span
                >
                <span class="text-fg text-base leading-tight font-bold tabular-nums">
                  {bfValue.toFixed(1)} %
                </span>
              </div>
            </div>
          {/if}

          {#if waterTargetMl > 0}
            <div
              class="bg-surface-2 border-border flex items-center gap-2 rounded-xl border px-3 py-2 last:[&:nth-child(odd)]:col-span-2 sm:last:[&:nth-child(odd)]:col-span-1"
            >
              <Droplet size={18} class="text-accent" />
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="text-muted text-[10px] font-semibold tracking-wider uppercase">
                  Вода {waterPct}%
                </span>
                <span class="text-fg text-sm leading-tight font-semibold tabular-nums">
                  {fmtLitres(waterMl)} / {fmtLitres(waterTargetMl)} л
                </span>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
{/if}

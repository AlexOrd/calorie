<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    X,
    Clock3,
    Utensils,
    Flame,
    Footprints,
    Droplet,
    Dumbbell,
    TrendingDown,
    TrendingUp,
    Equal,
  } from '@lucide/svelte';
  import {
    celebrate,
    fullscreenSummaryConfetti,
    pulseAttention,
    pulseSuccess,
    shakeWarning,
    type SummaryAnimState,
  } from '$lib/anim';
  import { formatTime } from '$lib/date';
  import type { DayRecapSummary, RecapBalanceState } from '$types/recap';

  interface Props {
    open: boolean;
    summary: DayRecapSummary | null;
    onClose: () => void;
  }

  let { open, summary, onClose }: Props = $props();

  let cardEl = $state<HTMLDivElement | undefined>(undefined);
  let balanceCardEl = $state<HTMLDivElement | undefined>(undefined);
  let intakeCardEl = $state<HTMLDivElement | undefined>(undefined);
  let stepsStatEl = $state<HTMLDivElement | undefined>(undefined);
  let waterStatEl = $state<HTMLDivElement | undefined>(undefined);
  let overCategoryStatEl = $state<HTMLDivElement | undefined>(undefined);

  const BALANCE_LABEL: Record<RecapBalanceState, string> = {
    deficit: 'Дефіцит',
    balanced: 'Баланс',
    surplus: 'Профіцит',
  };

  const BALANCE_CLASS: Record<RecapBalanceState, string> = {
    deficit: 'text-ok bg-ok/10 border-ok/30',
    balanced: 'text-muted bg-surface-2 border-border',
    surplus: 'text-warn bg-warn/10 border-warn/30',
  };

  function formatDateLabel(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat('uk-UA', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(d);
  }

  function fmtSigned(n: number): string {
    if (n === 0) return '0';
    return n > 0 ? `+${n}` : `-${Math.abs(n)}`;
  }

  function fmtLitres(ml: number): string {
    return (ml / 1000).toFixed(ml % 1000 === 0 ? 1 : 2);
  }

  function getBalanceIcon(state: RecapBalanceState) {
    if (state === 'deficit') return TrendingDown;
    if (state === 'surplus') return TrendingUp;
    return Equal;
  }

  let animState = $derived<SummaryAnimState>(summary ? summary.balanceState : 'balanced');

  let stepsMissed = $derived(summary ? summary.activity.steps < 7000 : false);
  let waterMissed = $derived(summary ? summary.activity.waterMl < summary.waterTargetMl : false);
  let categoriesOver = $derived(summary ? summary.overCategoryCount > 0 : false);

  let visibleEntries = $derived(summary ? [...summary.entries].sort((a, b) => a.ts - b.ts) : []);
  let BalanceIcon = $derived(summary ? getBalanceIcon(summary.balanceState) : Equal);

  function animateBadFields(): void {
    const badFields: HTMLElement[] = [];
    if (animState === 'surplus') {
      if (balanceCardEl) badFields.push(balanceCardEl);
      if (intakeCardEl) badFields.push(intakeCardEl);
    }
    if (stepsMissed && stepsStatEl) badFields.push(stepsStatEl);
    if (waterMissed && waterStatEl) badFields.push(waterStatEl);
    if (categoriesOver && overCategoryStatEl) badFields.push(overCategoryStatEl);

    for (const [idx, el] of badFields.entries()) {
      window.setTimeout(() => {
        pulseAttention(el);
      }, idx * 130);
    }
  }

  $effect(() => {
    if (open && cardEl && summary) {
      requestAnimationFrame(() => {
        if (!cardEl) return;

        // Split visual behavior by day state.
        if (animState === 'deficit') {
          celebrate(cardEl);
          fullscreenSummaryConfetti('deficit');
          return;
        }

        if (animState === 'balanced') pulseSuccess(cardEl);
        else shakeWarning(cardEl);

        animateBadFields();
      });
    }
  });

  let bbHandler: (() => void) | null = null;
  onMount(() => {
    bbHandler = () => onClose();
  });
  onDestroy(() => {
    bbHandler = null;
  });

  $effect(() => {
    const bb = window.Telegram?.WebApp?.BackButton;
    if (!bb || !bbHandler) return;
    if (open) {
      bb.onClick(bbHandler);
      bb.show();
      const h = bbHandler;
      return () => {
        bb.offClick(h);
        bb.hide();
      };
    }
  });

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onClose();
  }
</script>

{#if open && summary}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    role="presentation"
    onclick={onBackdropClick}
  >
    <div
      bind:this={cardEl}
      class="bg-surface border-border recap-card relative flex max-h-[88dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-2xl border p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recap-title"
    >
      <button
        type="button"
        aria-label="Закрити"
        class="text-muted hover:text-fg absolute top-3 right-3 rounded-md p-1 transition-colors"
        onclick={onClose}
      >
        <X size={20} />
      </button>

      <div class="flex flex-col gap-1 pr-8">
        <h2 id="recap-title" class="text-fg text-lg font-bold">Підсумок дня</h2>
        <p class="text-muted text-sm capitalize">{formatDateLabel(summary.date)}</p>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          bind:this={balanceCardEl}
          class={['rounded-xl border px-3 py-2', BALANCE_CLASS[summary.balanceState]]}
        >
          <div class="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <BalanceIcon size={14} />
            {BALANCE_LABEL[summary.balanceState]}
          </div>
          <p class="text-lg font-bold tabular-nums">{fmtSigned(summary.deltaKcal)} ккал</p>
        </div>

        <div
          bind:this={intakeCardEl}
          class="bg-surface-2 border-border rounded-xl border px-3 py-2"
        >
          <div
            class="text-muted mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase"
          >
            <Flame size={14} class="text-accent" />
            Спожито
          </div>
          <p class="text-fg text-lg font-bold tabular-nums">{summary.intakeKcal}</p>
        </div>

        <div class="bg-surface-2 border-border rounded-xl border px-3 py-2">
          <div
            class="text-muted mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase"
          >
            <Flame size={14} class="text-warn" />
            Спалено
          </div>
          <p class="text-fg text-lg font-bold tabular-nums">{summary.burnKcal}</p>
        </div>

        <div class="bg-surface-2 border-border rounded-xl border px-3 py-2">
          <div
            class="text-muted mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase"
          >
            <Utensils size={14} class="text-accent" />
            Записів
          </div>
          <p class="text-fg text-lg font-bold tabular-nums">{summary.entries.length}</p>
        </div>
      </div>

      <div class="bg-surface-2 border-border grid grid-cols-3 gap-2 rounded-xl border p-3">
        <div bind:this={stepsStatEl} class="flex items-center gap-1.5 text-sm">
          <Footprints size={16} class="text-accent" />
          <span class="text-fg font-semibold tabular-nums">{summary.activity.steps}</span>
        </div>
        <div bind:this={waterStatEl} class="flex items-center gap-1.5 text-sm">
          <Droplet size={16} class="text-accent" />
          <span class="text-fg font-semibold tabular-nums"
            >{fmtLitres(summary.activity.waterMl)} л</span
          >
        </div>
        <div class="flex items-center gap-1.5 text-sm">
          <Dumbbell size={16} class="text-accent" />
          <span class="text-fg font-semibold tabular-nums">{summary.activity.trainings}</span>
        </div>
      </div>

      <div
        class="bg-surface-2 border-border grid grid-cols-2 gap-2 rounded-xl border p-3 text-sm sm:grid-cols-5"
      >
        <div class="flex flex-col">
          <span class="text-muted text-xs">Ккал</span>
          <span class="text-fg font-semibold tabular-nums">{Math.round(summary.totals.kcal)}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-muted text-xs">Білки</span>
          <span class="text-fg font-semibold tabular-nums"
            >{Math.round(summary.totals.protein)} г</span
          >
        </div>
        <div class="flex flex-col">
          <span class="text-muted text-xs">Вугл.</span>
          <span class="text-fg font-semibold tabular-nums"
            >{Math.round(summary.totals.carbs)} г</span
          >
        </div>
        <div class="flex flex-col">
          <span class="text-muted text-xs">Жири</span>
          <span class="text-fg font-semibold tabular-nums">{Math.round(summary.totals.fat)} г</span>
        </div>
        <div bind:this={overCategoryStatEl} class="flex flex-col">
          <span class="text-muted text-xs">Перебір кат.</span>
          <span class="text-fg font-semibold tabular-nums">{summary.overCategoryCount}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="text-fg flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
          <Clock3 size={14} class="text-accent" />
          Що і коли
        </h3>
        {#if visibleEntries.length === 0}
          <p class="text-muted bg-surface-2 border-border rounded-xl border px-3 py-2 text-sm">
            За цей день немає записів у журналі.
          </p>
        {:else}
          <ul
            class="border-border bg-surface-2 divide-border max-h-56 divide-y overflow-y-auto rounded-xl border"
          >
            {#each visibleEntries as entry (entry.ts)}
              <li class="grid grid-cols-[56px_1fr_auto] items-center gap-2 px-3 py-2 text-sm">
                <span class="text-muted tabular-nums">{formatTime(entry.ts)}</span>
                <span class="text-fg truncate">{entry.name}</span>
                <span class="text-muted tabular-nums">
                  {entry.amount}
                  {entry.unit} · {Math.round(entry.pct)}%
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <button
        type="button"
        class="bg-accent text-on-accent hover:bg-accent/90 mt-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
        onclick={onClose}
      >
        Закрити
      </button>
    </div>
  </div>
{/if}

<style>
  .recap-card {
    animation: recap-pop 0.2s ease-out;
  }

  @keyframes recap-pop {
    from {
      opacity: 0;
      transform: scale(0.92);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .recap-card {
      animation: none;
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { Target, AlertCircle } from '@lucide/svelte';
  import { storage } from '$lib/storage';
  import { addDays, isLogKey, todayKey } from '$lib/date';
  import { profile } from '$state/profile.svelte';
  import { sumMacros } from '$lib/macros';
  import { personalizedDb } from '$state/personalizedDb';
  import { actualBurn } from '$lib/energy';
  import { projectGoalDate, type ProjectionResult } from '$lib/projection';
  import type { LogEntry } from '$types/log';
  import type { DayActivity } from '$types/activity';

  let projection = $state<ProjectionResult | null>(null);
  let reason = $state<'no-target' | 'no-data' | 'wrong-direction' | null>('no-target');
  let loaded = $state(false);

  onMount(async () => {
    if (!profile.value) {
      loaded = true;
      return;
    }
    if (profile.value.target_weight_kg === undefined) {
      reason = 'no-target';
      loaded = true;
      return;
    }

    const today = todayKey();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) dates.push(addDays(today, -i));

    const allKeys = await storage.keys();
    const logSet = new Set(allKeys.filter(isLogKey).map((k) => k.slice(4)));

    const recentDailyDeltas: number[] = [];
    for (const date of dates) {
      if (!logSet.has(date)) continue;
      const entries = await storage.load<LogEntry[]>(`log_${date}`, []);
      const dayAct = await storage.load<DayActivity>(`activity_${date}`, {
        steps: 0,
        trainings: 0,
        waterMl: 0,
      });
      if (entries.length === 0) continue;
      const intake = sumMacros(entries, personalizedDb()).kcal;
      const burn = actualBurn(profile.value, dayAct);
      recentDailyDeltas.push(intake - burn);
    }

    if (recentDailyDeltas.length === 0) {
      reason = 'no-data';
      loaded = true;
      return;
    }

    const result = projectGoalDate({
      todayIso: today,
      currentWeightKg: profile.value.weight,
      targetWeightKg: profile.value.target_weight_kg,
      recentDailyDeltas,
    });

    if (result === null) {
      reason = 'wrong-direction';
    } else {
      projection = result;
      reason = null;
    }
    loaded = true;
  });

  function fmtDate(iso: string): string {
    const months = [
      'січ.',
      'лют.',
      'бер.',
      'квіт.',
      'трав.',
      'черв.',
      'лип.',
      'серп.',
      'вер.',
      'жовт.',
      'лист.',
      'груд.',
    ];
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${d} ${months[m - 1] ?? ''} ${y}`;
  }
</script>

<div class="border-border bg-surface-2 flex flex-col gap-2 rounded-xl border p-4">
  <div class="flex items-center gap-2">
    <Target size={16} class="text-accent" />
    <h3 class="text-fg text-sm font-semibold">Прогноз цілі</h3>
  </div>

  {#if !loaded}
    <p class="text-muted text-xs">Рахуємо…</p>
  {:else if projection !== null}
    <p class="text-fg text-sm">
      За поточним темпом ≈
      <span class="text-accent font-semibold tabular-nums">
        {profile.value?.target_weight_kg?.toFixed(1)} кг
      </span>
      до
      <span class="font-semibold">{fmtDate(projection.etaIso)}</span>
      <span class="text-muted">({projection.daysAway} днів)</span>
    </p>
    <p class="text-muted text-xs">
      На основі середнього {projection.avgDailyDeltaKcal < 0 ? 'дефіциту' : 'профіциту'}
      <span class="tabular-nums">
        {Math.abs(projection.avgDailyDeltaKcal)} ккал/добу
      </span>
      за {projection.sampleDays}
      {projection.sampleDays === 1 ? 'день' : 'днів'}.
    </p>
  {:else if reason === 'no-target'}
    <p class="text-muted text-xs">
      <AlertCircle size={12} class="text-warn mr-1 inline" />
      Встанови цільову вагу, щоб побачити прогноз.
    </p>
  {:else if reason === 'no-data'}
    <p class="text-muted text-xs">
      <AlertCircle size={12} class="text-warn mr-1 inline" />
      Не вистачає даних — додай записи в журнал за останні 7 днів.
    </p>
  {:else}
    <p class="text-muted text-xs">
      <AlertCircle size={12} class="text-warn mr-1 inline" />
      Поточний темп не веде до цілі. Скоригуй раціон або активність.
    </p>
  {/if}
</div>

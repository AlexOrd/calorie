<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { X } from '@lucide/svelte';
  import { profile } from '$state/profile.svelte';
  import { bmrFormula } from '$lib/energy';

  interface Props {
    open: boolean;
    onClose: () => void;
  }
  let { open, onClose }: Props = $props();

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

  let activeFormula = $derived(profile.value ? bmrFormula(profile.value) : null);
</script>

{#snippet swatch(varName: string)}
  <span
    class="inline-block h-3 w-3 rounded-full align-[-1px]"
    style="background: var(--color-{varName});"
    aria-hidden="true"
  ></span>
{/snippet}

{#snippet section(swatchVar: string, title: string, body: Snippet)}
  <section class="flex flex-col gap-2">
    <h3 class="text-fg flex items-center gap-2 text-sm font-semibold">
      {@render swatch(swatchVar)}
      {title}
    </h3>
    {@render body()}
  </section>
{/snippet}

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    role="presentation"
    onclick={onBackdropClick}
  >
    <div
      class="bg-surface border-border relative flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-help-title"
    >
      <button
        type="button"
        aria-label="Закрити"
        class="text-muted hover:text-fg absolute top-3 right-3 rounded-md p-1 transition-colors"
        onclick={onClose}
      >
        <X size={20} />
      </button>

      <h2 id="stats-help-title" class="text-fg text-lg font-bold">Як рахуються показники</h2>

      {#snippet kcalBody()}
        <p class="text-fg/90 text-sm">
          Денна ціль = TDEE (підтримання ваги). Червоний бар і шейк-анімація з'являються при
          перевищенні на 5 % і більше.
        </p>
      {/snippet}
      {@render section('accent', 'Калорії', kcalBody)}

      {#snippet proteinBody()}
        <p class="text-fg/90 text-sm">
          Білок: 1.6 г/кг для активних (множник ≥ 1.55), 1.2 г/кг для інших.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs"
          >protein_g = вага × (1.2|1.6)</code
        >
      {/snippet}
      {@render section('danger', 'Білок', proteinBody)}

      {#snippet carbsBody()}
        <p class="text-fg/90 text-sm">Вуглеводи — 50 % калорій, 4 ккал/г.</p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">carbs_g = TDEE × 0.5 / 4</code>
      {/snippet}
      {@render section('warn', 'Вуглеводи', carbsBody)}

      {#snippet fatBody()}
        <p class="text-fg/90 text-sm">Жири — 30 % калорій, 9 ккал/г.</p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">fat_g = TDEE × 0.3 / 9</code>
      {/snippet}
      {@render section('fat', 'Жири', fatBody)}

      {#snippet bmrBody()}
        <p class="text-fg/90 text-sm">
          Калорії, що тіло спалює у спокої за добу. Якщо у профілі заповнені талія + шия (для ♀
          також стегна), використовуємо Katch–McArdle (через жирову масу), інакше — Mifflin-St Jeor.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          Mifflin: 10·вага + 6.25·зріст − 5·вік + (5 ♂ / −161 ♀)
        </code>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          Katch: 370 + 21.6 × нежирова_маса
        </code>
        {#if activeFormula}
          <p class="text-muted text-xs">
            Зараз для тебе: <span class="text-fg font-semibold"
              >{activeFormula === 'katch' ? 'Katch–McArdle' : 'Mifflin-St Jeor'}</span
            >.
          </p>
        {/if}
      {/snippet}
      {@render section('muted', 'BMR', bmrBody)}

      {#snippet tdeeBody()}
        <p class="text-fg/90 text-sm">
          BMR × множник активності — добова норма для підтримки ваги.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          TDEE = BMR × 1.2 (сидячий) / 1.375 / 1.55 / 1.725 (атлет)
        </code>
      {/snippet}
      {@render section('muted', 'TDEE', tdeeBody)}

      {#snippet burnBody()}
        <p class="text-fg/90 text-sm">
          Сума: базовий обмін + калорії від кроків + 120 ккал за тренування.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          burn = BMR + кроки × вага × 0.0005 + тренування × 120
        </code>
      {/snippet}
      {@render section('accent', 'Спалено за день', burnBody)}

      {#snippet balanceBody()}
        <p class="text-fg/90 text-sm">Спожито мінус спалено. Зелена зона ±100 ккал.</p>
        <ul class="text-fg/90 ml-4 list-none space-y-1 text-sm">
          <li class="flex items-center gap-2">
            {@render swatch('accent')}
            <span>Дефіцит — delta &lt; −100 ккал → схуднення</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('muted')}
            <span>Баланс — −100 ≤ delta ≤ +100 ккал</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('warn')}
            <span>Профіцит — delta &gt; +100 ккал → набір</span>
          </li>
        </ul>
      {/snippet}
      {@render section('accent', 'Енергобаланс', balanceBody)}

      {#snippet bodyFatBody()}
        <p class="text-fg/90 text-sm">
          Формула US Navy за обхватами талії, шиї (та стегон ♀) і зростом. Коли заповнені —
          переключає BMR на Katch–McArdle.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          ♂ 86.01·log10(талія−шия) − 70.041·log10(зріст) + 36.76
        </code>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          ♀ 163.205·log10(талія+стегна−шия) − 97.684·log10(зріст) − 78.387
        </code>
      {/snippet}
      {@render section('warn', 'Жир %', bodyFatBody)}

      {#snippet bmiBody()}
        <p class="text-fg/90 text-sm">Індекс маси тіла. Скринінговий показник (WHO).</p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">BMI = вага / зріст² (м)</code>
        <ul class="text-fg/90 ml-4 list-none space-y-1 text-sm">
          <li class="flex items-center gap-2">
            {@render swatch('muted')}<span>&lt; 18.5 — нестача ваги</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('ok')}<span>18.5–24.9 — норма</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('warn')}<span>25.0–29.9 — надмірна вага</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('accent')}<span>≥ 30 — ожиріння</span>
          </li>
        </ul>
      {/snippet}
      {@render section('ok', 'BMI', bmiBody)}

      {#snippet hydrationBody()}
        <p class="text-fg/90 text-sm">
          Ціль: 30 мл × кг, мінімум 2.0 л (♀) / 2.5 л (♂). Сильна нестача (&lt; 50 % від цілі) додає
          страйк до денного вердикту в календарі.
        </p>
        <ul class="text-fg/90 ml-4 list-none space-y-1 text-sm">
          <li class="flex items-center gap-2">
            {@render swatch('danger')}<span>Нестача — менше 70 % цілі</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('ok')}<span>Норма — 70–120 % цілі</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('fat')}<span>Понад норму — більше 120 %</span>
          </li>
        </ul>
      {/snippet}
      {@render section('accent', 'Гідрація', hydrationBody)}

      {#snippet categoryBody()}
        <p class="text-fg/90 text-sm">
          Кожна з категорій А–З має 100 % денну квоту. k_factor масштабує грами для кожної людини
          (більшим людям — більше).
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          k_factor = clamp(TDEE / TDEE_baseline, 0.6, 1.6)
        </code>
        <p class="text-muted text-xs">
          Штучні одиниці (наприклад, яйця) не масштабуються — лише грамові продукти.
        </p>
      {/snippet}
      {@render section('accent', 'Категорії А–З', categoryBody)}

      {#snippet calendarBody()}
        <p class="text-fg/90 text-sm">Денний вердикт за 90-денним календарем.</p>
        <ul class="text-fg/90 ml-4 list-none space-y-1 text-sm">
          <li class="flex items-center gap-2">
            {@render swatch('ok')}<span>Усі категорії ≤ 100 %</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('warn')}<span>1–2 перевищення</span>
          </li>
          <li class="flex items-center gap-2">
            {@render swatch('accent')}<span>3+ перевищень</span>
          </li>
        </ul>
        <p class="text-muted text-xs">
          Сильна нестача гідрації додає один страйк. Перше число місяця підкреслене обведенням.
        </p>
      {/snippet}
      {@render section('warn', 'Календар (90 днів)', calendarBody)}

      {#snippet streakBody()}
        <p class="text-fg/90 text-sm">
          Стрик дефіциту — день із delta &lt; −100 ккал подовжує серію; день у балансі чи профіциті
          обриває її. Стрик води — день, у який випито ≥ цілі.
        </p>
      {/snippet}
      {@render section('accent', 'Стрики', streakBody)}

      {#snippet projectionBody()}
        <p class="text-fg/90 text-sm">
          Прогноз цілі — середній денний Δ ккал за останні 7 днів. Перетворюється у кг/добу через
          ~7700 ккал/кг і дає орієнтовну дату.
        </p>
      {/snippet}
      {@render section('accent', 'Прогноз цілі', projectionBody)}

      <button
        type="button"
        class="bg-accent text-on-accent hover:bg-accent/90 mt-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        onclick={onClose}
      >
        Закрити
      </button>
    </div>
  </div>
{/if}

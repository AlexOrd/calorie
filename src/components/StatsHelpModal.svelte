<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { X } from '@lucide/svelte';

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
</script>

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

      <section class="flex flex-col gap-2">
        <h3 class="text-accent text-xs font-semibold tracking-wider uppercase">BMI</h3>
        <p class="text-fg/90 text-sm">
          Індекс маси тіла. Норма 18.5–24.9. Базовий скринінговий показник за стандартом WHO.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">BMI = вага / зріст² (м)</code>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-accent text-xs font-semibold tracking-wider uppercase">BMR</h3>
        <p class="text-fg/90 text-sm">
          Калорії, що тіло спалює у спокої за добу. Формула Mifflin-St Jeor.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          10·вага + 6.25·зріст − 5·вік + (5 ♂ / −161 ♀)
        </code>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-accent text-xs font-semibold tracking-wider uppercase">TDEE</h3>
        <p class="text-fg/90 text-sm">
          BMR × множник активності — добова норма для підтримки ваги.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          TDEE = BMR × 1.2 / 1.375 / 1.55 / 1.725
        </code>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-accent text-xs font-semibold tracking-wider uppercase">Енергобаланс</h3>
        <p class="text-fg/90 text-sm">
          Спожито мінус спалено. Зелена зона ±100 ккал. Дефіцит → схуднення, профіцит → набір.
        </p>
        <code class="bg-surface-2 block rounded px-2 py-1 text-xs">
          delta = intake − (BMR + step_kcal + training_kcal)
        </code>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-accent text-xs font-semibold tracking-wider uppercase">Гідрація</h3>
        <p class="text-fg/90 text-sm">
          Ціль на основі ваги: 30 мл × кг, мінімум 2.0 л (♀) / 2.5 л (♂). Сильна нестача (&lt; 50 %
          від цілі) додає страйк до денного вердикту.
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-accent text-xs font-semibold tracking-wider uppercase">
          Кольори календаря
        </h3>
        <ul class="text-fg/90 ml-4 list-disc space-y-1 text-sm">
          <li><span class="text-ok font-semibold">Зелений</span>: усі категорії ≤ 100 %.</li>
          <li><span class="text-warn font-semibold">Жовтий</span>: 1–2 перевищення.</li>
          <li><span class="text-accent font-semibold">Червоний</span>: 3+ перевищень.</li>
        </ul>
        <p class="text-muted text-xs">Сильна нестача гідрації додає один страйк.</p>
      </section>

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

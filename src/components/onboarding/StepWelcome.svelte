<script lang="ts">
  interface Props {
    onNext: () => void;
  }
  let { onNext }: Props = $props();
</script>

<div class="flex flex-col items-center gap-6 text-center">
  <div
    class="flex h-46 w-46 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg shadow-black/30"
  >
    <img src="/logo.png" alt="Calorie" class="h-32 w-auto object-contain" />
  </div>
  <h1 class="text-accent text-3xl font-bold">Calorie</h1>
  <p class="text-fg">
    Персональний щоденник раціону за категоріями. Дані залишаються на вашому пристрої.
  </p>
  <p class="text-muted text-sm">Спершу — кілька параметрів, щоб налаштувати норми під вас.</p>
  <button
    type="button"
    class="bg-accent text-on-accent mt-4 min-h-14 self-center rounded-lg px-8 py-4 text-lg font-semibold shadow-md shadow-black/20"
    onclick={onNext}
  >
    Почати
  </button>
</div>

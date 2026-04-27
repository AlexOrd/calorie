<script lang="ts">
  interface Props {
    onNext: () => void;
  }
  let { onNext }: Props = $props();
</script>

<div class="flex flex-col gap-6 text-center">
  <h1 class="text-accent text-3xl font-bold">Calorie</h1>
  <p class="text-fg">
    Персональний щоденник раціону за категоріями. Дані залишаються на вашому пристрої.
  </p>
  <p class="text-muted text-sm">Спершу — кілька параметрів, щоб налаштувати норми під вас.</p>
  <button
    type="button"
    class="bg-accent mt-4 self-center rounded-md px-6 py-2 text-white"
    onclick={onNext}
  >
    Почати
  </button>
</div>

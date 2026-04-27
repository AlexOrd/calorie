<script lang="ts">
  import { profile } from '$state/profile.svelte';

  async function bootstrap(): Promise<void> {
    await profile.save({
      height: 168,
      weight: 74,
      gender: 'female',
      age: 30,
      activity: 1.2,
    });
  }
</script>

<section class="mx-auto max-w-md p-6">
  <h1 class="mb-4 text-2xl font-bold">Calorie</h1>
  <p class="text-muted mb-6">
    Тимчасовий екран онбордингу. Натисніть, щоб створити дефолтний профіль.
  </p>
  <button type="button" class="bg-accent rounded-md px-4 py-2 text-white" onclick={bootstrap}>
    Почати
  </button>
</section>

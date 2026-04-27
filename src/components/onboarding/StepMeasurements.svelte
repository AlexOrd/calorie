<script lang="ts">
  import type { ProfileInput } from '$types/profile';
  import ProfileForm from '../ProfileForm.svelte';

  interface Props {
    onSubmit: (input: ProfileInput) => void;
  }
  let { onSubmit }: Props = $props();
</script>

<div class="flex flex-col gap-3">
  <h2 class="text-xl font-semibold">Параметри</h2>
  <ProfileForm submitLabel="Продовжити" {onSubmit} />
</div>

<script lang="ts">
  import { fly } from 'svelte/transition';
  import { profile } from '$state/profile.svelte';
  import StepWelcome from '../components/onboarding/StepWelcome.svelte';
  import StepMeasurements from '../components/onboarding/StepMeasurements.svelte';
  import StepConfirm from '../components/onboarding/StepConfirm.svelte';
  import type { ProfileInput } from '$types/profile';

  type Step = 0 | 1 | 2;
  let step = $state<Step>(0);
  let input = $state<ProfileInput | null>(null);

  function next(): void {
    if (step === 0) step = 1;
    else if (step === 1) step = 2;
  }

  function back(): void {
    if (step === 2) step = 1;
    else if (step === 1) step = 0;
  }

  function setInput(value: ProfileInput): void {
    input = value;
    next();
  }

  async function confirm(): Promise<void> {
    if (!input) return;
    await profile.save(input);
  }
</script>

<section class="h-dvh overflow-y-auto overscroll-contain" style="scroll-padding-bottom: 16rem;">
  <div
    class="mx-auto flex min-h-full max-w-md flex-col justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
  >
    {#if step === 0}
      <div in:fly={{ x: 24, duration: 250 }}>
        <StepWelcome onNext={next} />
      </div>
    {:else if step === 1}
      <div in:fly={{ x: 24, duration: 250 }}>
        <StepMeasurements onSubmit={setInput} />
      </div>
    {:else if step === 2 && input}
      <div in:fly={{ x: 24, duration: 250 }}>
        <StepConfirm {input} onConfirm={confirm} onBack={back} />
      </div>
    {/if}
  </div>
</section>

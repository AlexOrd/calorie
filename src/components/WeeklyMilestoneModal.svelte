<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { X, Flame, Droplet, Salad } from '@lucide/svelte';
  import { burstConfetti } from '$lib/anim';

  export interface MilestoneBadge {
    kind: 'deficit' | 'water' | 'category';
    title: string;
    body: string;
  }

  interface Props {
    open: boolean;
    badges: readonly MilestoneBadge[];
    onClose: () => void;
  }
  let { open, badges, onClose }: Props = $props();

  const ICONS = { deficit: Flame, water: Droplet, category: Salad } as const;

  let cardEl = $state<HTMLDivElement | undefined>(undefined);

  $effect(() => {
    if (open && cardEl) {
      requestAnimationFrame(() => {
        if (cardEl) burstConfetti(cardEl);
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

{#if open && badges.length > 0}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    role="presentation"
    onclick={onBackdropClick}
  >
    <div
      bind:this={cardEl}
      class="bg-surface border-border milestone-card relative flex w-full max-w-md flex-col gap-4 rounded-2xl border p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
    >
      <button
        type="button"
        aria-label="Закрити"
        class="text-muted hover:text-fg absolute top-3 right-3 rounded-md p-1 transition-colors"
        onclick={onClose}
      >
        <X size={20} />
      </button>

      <h2 id="milestone-title" class="text-fg text-lg font-bold">Тиждень закрито!</h2>

      {#each badges as badge, i (i)}
        {@const Icon = ICONS[badge.kind]}
        <div class="bg-accent/5 border-accent/20 flex gap-3 rounded-xl border p-4">
          <Icon size={28} class="text-accent shrink-0" />
          <div class="flex flex-col gap-1">
            <h3 class="text-fg text-base font-semibold">{badge.title}</h3>
            <p class="text-fg/80 text-sm">{badge.body}</p>
          </div>
        </div>
      {/each}

      <button
        type="button"
        class="bg-accent text-on-accent hover:bg-accent/90 mt-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        onclick={onClose}
      >
        Дякую
      </button>
    </div>
  </div>
{/if}

<style>
  .milestone-card {
    animation: milestone-pop 0.2s ease-out;
  }

  @keyframes milestone-pop {
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
    .milestone-card {
      animation: none;
    }
  }
</style>

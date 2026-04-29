<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { X } from '@lucide/svelte';
  import {
    CHANGELOG_ICONS,
    type ChangelogItem,
    type MajorItem,
    type MinorItem,
  } from '$types/changelog';
  import { burstConfetti } from '$lib/anim';

  interface Props {
    open: boolean;
    items: readonly ChangelogItem[];
    onClose: () => void;
  }
  let { open, items, onClose }: Props = $props();

  let cardEl = $state<HTMLDivElement | undefined>(undefined);

  let majors = $derived(items.filter((i): i is MajorItem => i.type === 'major'));
  let features = $derived(items.filter((i): i is MinorItem => i.type === 'feature'));

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

  function getIcon(item: MajorItem) {
    return CHANGELOG_ICONS[item.icon ?? 'Sparkles'];
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    role="presentation"
    onclick={onBackdropClick}
  >
    <div
      bind:this={cardEl}
      class="bg-surface border-border whats-new-card relative flex w-full max-w-md flex-col gap-4 rounded-2xl border p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <button
        type="button"
        aria-label="Закрити"
        class="text-muted hover:text-fg absolute top-3 right-3 rounded-md p-1 transition-colors"
        onclick={onClose}
      >
        <X size={20} />
      </button>

      <h2 id="whats-new-title" class="text-fg text-lg font-bold">Що нового</h2>

      {#each majors as item, i (i)}
        {@const Icon = getIcon(item)}
        <div class="bg-accent/5 border-accent/20 flex gap-3 rounded-xl border p-4">
          <Icon size={28} class="text-accent shrink-0" />
          <div class="flex flex-col gap-1">
            <h3 class="text-fg text-base font-semibold">{item.title}</h3>
            <p class="text-fg/80 text-sm">{item.body}</p>
          </div>
        </div>
      {/each}

      {#if features.length > 0}
        <div class="flex flex-col gap-1">
          <h4 class="text-muted text-xs font-semibold tracking-wider uppercase">
            Також у цій версії
          </h4>
          <ul class="text-fg/90 mt-1 list-disc space-y-1 pl-5 text-sm">
            {#each features as item, i (i)}
              <li>{item.text}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <button
        type="button"
        class="bg-accent text-on-accent hover:bg-accent/90 mt-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        onclick={onClose}
      >
        Зрозуміло
      </button>
    </div>
  </div>
{/if}

<style>
  .whats-new-card {
    animation: whats-new-pop 0.2s ease-out;
  }

  @keyframes whats-new-pop {
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
    .whats-new-card {
      animation: none;
    }
  }
</style>

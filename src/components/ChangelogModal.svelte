<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { X } from '@lucide/svelte';
  import { changelog } from '../data/changelog';
  import { CHANGELOG_ICONS, type MajorItem } from '$types/changelog';

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

  function majorIcon(item: MajorItem) {
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
      class="bg-surface border-border relative flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
    >
      <button
        type="button"
        aria-label="Закрити"
        class="text-muted hover:text-fg absolute top-3 right-3 rounded-md p-1 transition-colors"
        onclick={onClose}
      >
        <X size={20} />
      </button>

      <h2 id="changelog-title" class="text-fg text-lg font-bold">Журнал змін</h2>

      {#each changelog as entry (entry.version)}
        <section class="border-border border-t pt-3 first:border-t-0 first:pt-0">
          <header class="text-muted mb-2 flex items-baseline gap-2 text-xs">
            <span class="text-fg font-semibold tabular-nums">v{entry.version}</span>
            <span class="text-muted">·</span>
            <span>{fmtDate(entry.date)}</span>
          </header>

          <div class="flex flex-col gap-2">
            {#each entry.items as item, i (i)}
              {#if item.type === 'major'}
                {@const Icon = majorIcon(item)}
                <div class="bg-accent/5 border-accent/20 flex gap-3 rounded-lg border p-3">
                  <Icon size={20} class="text-accent shrink-0" />
                  <div class="flex flex-col gap-0.5">
                    <h3 class="text-fg text-sm font-semibold">{item.title}</h3>
                    <p class="text-fg/80 text-xs">{item.body}</p>
                  </div>
                </div>
              {:else if item.type === 'feature'}
                <div class="text-fg/90 pl-2 text-sm">+ {item.text}</div>
              {:else}
                <div class="text-muted pl-2 text-xs">· {item.text}</div>
              {/if}
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
{/if}

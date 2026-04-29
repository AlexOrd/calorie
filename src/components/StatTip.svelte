<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
  }
  let { title, children }: Props = $props();
</script>

<details class="stat-tip border-border bg-surface-2 group rounded-lg border">
  <summary
    class="text-muted hover:text-fg flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold tracking-wide uppercase select-none"
  >
    <ChevronDown size={14} class="transition-transform duration-200 group-open:rotate-180" />
    {title}
  </summary>
  <div class="stat-tip__body">
    <div class="text-fg/90 px-3 pb-3 text-sm">
      {@render children()}
    </div>
  </div>
</details>

<style>
  .stat-tip > summary::-webkit-details-marker {
    display: none;
  }

  .stat-tip__body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease-out;
  }

  .stat-tip__body > div {
    overflow: hidden;
  }

  .stat-tip[open] .stat-tip__body {
    grid-template-rows: 1fr;
  }

  @media (prefers-reduced-motion: reduce) {
    .stat-tip__body {
      transition: none;
    }
  }
</style>

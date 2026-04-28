<script lang="ts">
  import { NAV_ITEMS } from '$lib/nav';
  import { activeRoute } from '$state/route.svelte';
</script>

<nav
  class="bg-bg flex shrink-0 border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden"
  aria-label="Головна навігація"
>
  {#each NAV_ITEMS as item (item.key)}
    {@const Icon = item.icon}
    <button
      type="button"
      class={[
        'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px]',
        activeRoute.value === item.key ? 'text-accent' : 'text-muted',
      ]}
      aria-current={activeRoute.value === item.key ? 'page' : undefined}
      onclick={() => activeRoute.set(item.key)}
    >
      <span
        class={[
          'flex items-center justify-center rounded-full px-3 py-1 transition-colors',
          activeRoute.value === item.key && 'bg-accent/15',
        ]}
      >
        <Icon size={22} class={activeRoute.value === item.key ? 'fill-current' : ''} />
      </span>
      {item.label}
    </button>
  {/each}
</nav>

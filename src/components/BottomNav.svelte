<script lang="ts">
  import { NAV_ITEMS } from '$lib/nav';
  import { activeRoute } from '$state/route.svelte';
</script>

<nav
  class="bg-bg fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden"
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
      <Icon size={24} />
      {item.label}
    </button>
  {/each}
</nav>

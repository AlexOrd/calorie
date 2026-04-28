<script lang="ts">
  import { NAV_ITEMS } from '$lib/nav';
  import { activeRoute } from '$state/route.svelte';
</script>

<nav
  class="hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-white/10 p-4 md:flex"
  aria-label="Головна навігація"
>
  <div class="mb-4 flex items-center gap-2 px-2">
    <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
      <img src="/logo.png" alt="" class="h-8 w-auto object-contain" />
    </div>
    <h1 class="text-accent text-lg font-semibold">Calorie</h1>
  </div>
  {#each NAV_ITEMS as item (item.key)}
    {@const Icon = item.icon}
    <button
      type="button"
      class={[
        'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
        activeRoute.value === item.key
          ? 'text-accent border-accent bg-white/5'
          : 'text-muted border-transparent hover:bg-white/5',
      ]}
      aria-current={activeRoute.value === item.key ? 'page' : undefined}
      onclick={() => activeRoute.set(item.key)}
    >
      <Icon size={18} />
      {item.label}
    </button>
  {/each}
</nav>

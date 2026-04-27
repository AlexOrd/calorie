<script lang="ts">
  import { NAV_ITEMS, type TabKey } from '$lib/nav';

  interface Props {
    current: TabKey;
  }
  let { current = $bindable() }: Props = $props();
</script>

<nav
  class="bg-bg fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 md:hidden"
  aria-label="Головна навігація"
>
  {#each NAV_ITEMS as item (item.key)}
    {@const Icon = item.icon}
    <button
      type="button"
      class={[
        'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
        current === item.key ? 'text-accent' : 'text-muted',
      ]}
      aria-current={current === item.key ? 'page' : undefined}
      onclick={() => (current = item.key)}
    >
      <Icon size={22} />
      {item.label}
    </button>
  {/each}
</nav>

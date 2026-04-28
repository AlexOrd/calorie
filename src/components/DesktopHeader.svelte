<script lang="ts">
  import { NAV_ITEMS } from '$lib/nav';
  import { activeRoute } from '$state/route.svelte';
  import DateStrip from './DateStrip.svelte';

  let title = $derived(NAV_ITEMS.find((i) => i.key === activeRoute.value)?.label ?? '');
</script>

<header class="border-border hidden items-center justify-between gap-4 border-b px-6 py-3 md:flex">
  <h2 class="text-fg text-xl font-semibold">{title}</h2>
  <DateStrip compact />
</header>

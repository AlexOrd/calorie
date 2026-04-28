<script lang="ts">
  import { getTelegramUser } from '$lib/telegram';

  const user = getTelegramUser();
  const initial = user?.first_name?.[0] ?? '?';
  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Одрі';
</script>

<div class="mb-5 flex items-center gap-3">
  <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/5">
    {#if user?.photo_url}
      <img src={user.photo_url} alt="" class="h-12 w-12 object-cover" />
    {:else if user}
      <span class="text-accent text-xl font-semibold">{initial}</span>
    {:else}
      <img src="/logo.png" alt="" class="h-9 w-9 object-contain" />
    {/if}
  </div>
  <div class="flex min-w-0 flex-col">
    <div class="flex items-center gap-1.5">
      <span class="text-fg truncate text-base font-semibold">{fullName}</span>
      {#if user?.is_premium}
        <span class="text-warn text-sm" aria-label="Telegram Premium">★</span>
      {/if}
    </div>
    {#if user?.username}
      <span class="text-muted truncate text-sm">@{user.username}</span>
    {/if}
  </div>
</div>

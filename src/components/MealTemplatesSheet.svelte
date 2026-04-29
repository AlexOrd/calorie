<script lang="ts">
  import { X, Save, Trash2, Bookmark } from '@lucide/svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { loadTemplates, saveTemplate, deleteTemplate, templateToEntries } from '$lib/templates';
  import { confirmAsync } from '$lib/dialog';
  import { hapticImpact, hapticSelection } from '$lib/haptics';
  import { celebrate } from '$lib/anim';
  import type { MealTemplate } from '$types/template';

  interface Props {
    open: boolean;
    onClose: () => void;
  }
  let { open, onClose }: Props = $props();

  let tab = $state<'list' | 'save'>('list');
  let templates = $state<MealTemplate[]>([]);
  let templateName = $state('');
  let saving = $state(false);

  $effect(() => {
    if (open) {
      void refresh();
      tab = 'list';
      templateName = '';
    }
  });

  async function refresh(): Promise<void> {
    templates = await loadTemplates();
  }

  let todayItems = $derived(
    dailyLog.entries.map((e) => ({
      cat: e.cat,
      id: e.id,
      pct: e.pct,
      name: personalizedDb()[e.cat]?.items[e.id]?.name ?? e.id,
    })),
  );

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSave(): Promise<void> {
    if (todayItems.length === 0 || saving) return;
    saving = true;
    try {
      await saveTemplate(
        templateName,
        todayItems.map((i) => ({ cat: i.cat, id: i.id, pct: i.pct })),
      );
      hapticImpact('light');
      await refresh();
      tab = 'list';
      templateName = '';
    } finally {
      saving = false;
    }
  }

  function handleApply(template: MealTemplate, btn: HTMLElement): void {
    const baseTs = Date.now();
    const entries = templateToEntries(template, baseTs);
    for (const entry of entries) {
      dailyLog.add(entry);
    }
    hapticImpact('light');
    celebrate(btn);
  }

  async function handleDelete(template: MealTemplate): Promise<void> {
    const ok = await confirmAsync(`Видалити шаблон "${template.name}"?`);
    if (!ok) return;
    hapticSelection();
    await deleteTemplate(template.id);
    await refresh();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    role="presentation"
    onclick={onBackdropClick}
  >
    <div
      class="bg-surface border-border relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="templates-title"
    >
      <header class="border-border flex items-center justify-between border-b px-4 py-3">
        <div class="flex items-center gap-2">
          <Bookmark size={16} class="text-accent" />
          <h2 id="templates-title" class="text-fg text-base font-semibold">Шаблони</h2>
        </div>
        <button
          type="button"
          aria-label="Закрити"
          class="text-muted hover:text-fg rounded-md p-1 transition-colors"
          onclick={onClose}
        >
          <X size={20} />
        </button>
      </header>

      <div class="border-border flex border-b text-sm">
        <button
          type="button"
          class={[
            'flex-1 px-3 py-2.5 font-semibold transition-colors',
            tab === 'list' ? 'text-fg border-accent border-b-2' : 'text-muted',
          ]}
          onclick={() => (tab = 'list')}
        >
          Мої шаблони
        </button>
        <button
          type="button"
          class={[
            'flex-1 px-3 py-2.5 font-semibold transition-colors',
            tab === 'save' ? 'text-fg border-accent border-b-2' : 'text-muted',
          ]}
          onclick={() => (tab = 'save')}
        >
          Зберегти день
        </button>
      </div>

      <div class="flex flex-col gap-3 overflow-y-auto p-4">
        {#if tab === 'list'}
          {#if templates.length === 0}
            <p class="text-muted py-6 text-center text-sm">
              Ще немає шаблонів. Збережи поточний день, щоб додати перший.
            </p>
          {:else}
            {#each templates as template (template.id)}
              <div class="border-border bg-surface-2 flex flex-col gap-2 rounded-lg border p-3">
                <div class="flex items-baseline justify-between gap-2">
                  <h3 class="text-fg flex-1 text-sm font-semibold">{template.name}</h3>
                  <span class="text-muted text-xs tabular-nums">
                    {template.items.length} зап.
                  </span>
                </div>
                <ul class="text-muted flex flex-col gap-0.5 text-xs">
                  {#each template.items.slice(0, 4) as item, i (i)}
                    <li class="truncate">
                      <span class="text-fg/80 tabular-nums">{item.pct}%</span>
                      · {personalizedDb()[item.cat]?.items[item.id]?.name ?? item.id}
                    </li>
                  {/each}
                  {#if template.items.length > 4}
                    <li class="text-muted">+ {template.items.length - 4} ще…</li>
                  {/if}
                </ul>
                <div class="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    class="bg-accent text-on-accent hover:bg-accent/90 inline-flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors"
                    onclick={(e) => {
                      const target = e.currentTarget;
                      if (target instanceof HTMLElement) handleApply(template, target);
                    }}
                  >
                    Додати в журнал
                  </button>
                  <button
                    type="button"
                    aria-label="Видалити шаблон"
                    class="text-muted hover:text-danger rounded-md p-2 transition-colors"
                    onclick={() => void handleDelete(template)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        {:else if todayItems.length === 0}
          <p class="text-muted py-6 text-center text-sm">
            Сьогодні ще нічого не додано. Внеси кілька записів — і повертайся.
          </p>
        {:else}
          <label class="text-muted flex flex-col gap-1.5 text-sm">
            Назва шаблону
            <input
              type="text"
              placeholder="Звичайний сніданок"
              autocomplete="off"
              class="text-fg border-border bg-surface-2 focus:border-accent focus:ring-accent/20 rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none"
              bind:value={templateName}
            />
          </label>
          <ul class="border-border bg-surface-2 flex flex-col gap-1 rounded-lg border p-3 text-xs">
            {#each todayItems as item, i (i)}
              <li class="flex items-baseline justify-between">
                <span class="text-fg flex-1 truncate">{item.name}</span>
                <span class="text-muted tabular-nums">{item.pct}%</span>
              </li>
            {/each}
          </ul>
          <button
            type="button"
            class="bg-accent text-on-accent hover:bg-accent/90 mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
            disabled={saving}
            onclick={() => void handleSave()}
          >
            <Save size={14} />
            Зберегти {todayItems.length}
            {todayItems.length === 1 ? 'запис' : 'записів'}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

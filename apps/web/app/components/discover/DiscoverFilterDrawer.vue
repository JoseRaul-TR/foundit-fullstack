<!-- apps/web/app/components/discover/DiscoverFilterDrawer.vue -->
<!-- Figma 39:85 (desktop drawer) and 44:125 (mobile bottom sheet).
     Deliberately NOT teleported to body: fixed positioning is enough here
     because no ancestor of DiscoverPanel establishes a containing block
     (no transform / filter / contain / will-change), and stacking two more
     teleports against MediaDetailsModal and ToastContainer is exactly the
     anchor-order trap that cost us #152. If a transform ever appears on a
     layout wrapper, this breaks visibly and Teleport becomes the answer. -->
<template>
  <Transition name="drawer">
    <div v-if="store.filtersOpen" class="fixed inset-0 z-[90]">
      <div
        class="absolute inset-0 bg-black/60"
        aria-hidden="true"
        @click="close"
      />

      <div
        id="discover-filter-drawer"
        ref="panelRef"
        class="drawer-panel absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-surface sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[360px] sm:max-w-full sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('discover.filters.title')"
        tabindex="-1"
      >
        <!-- Grab handle: mobile affordance only, the desktop drawer has none. -->
        <div
          class="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border sm:hidden"
          aria-hidden="true"
        />

        <header
          class="flex shrink-0 items-center justify-between gap-3 px-6 py-5"
        >
          <h2 class="text-lg font-bold text-primary">
            {{ $t("discover.filters.title") }}
          </h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition hover:text-primary"
            :aria-label="$t('common.close')"
            @click="close"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <DiscoverFilters ref="filtersRef" />
        </div>

        <footer
          class="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-4"
        >
          <button
            type="button"
            class="text-sm font-medium text-secondary transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!store.hasActiveFilters"
            @click="clearAll"
          >
            {{ $t("discover.filters.clear") }}
          </button>
          <button
            type="button"
            class="rounded-full bg-brand px-4 py-2 text-sm font-bold text-page transition hover:brightness-110"
            @click="apply"
          >
            {{ $t("discover.filters.apply") }}
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const store = useDiscoverStore();

const panelRef = ref<HTMLElement | null>(null);
// Structural typing instead of InstanceType<typeof DiscoverFilters>: the child
// is auto-imported, so naming its type would mean importing the component here
// purely for the type. Only these two methods are ever called.
const filtersRef = ref<{ apply: () => void; clearAll: () => void } | null>(
  null,
);

function close() {
  store.closeFilters();
}

function apply() {
  filtersRef.value?.apply();
  close();
}

function clearAll() {
  // Clearing does not close: the user is usually mid-adjustment, and closing
  // would hide the very panel they are working in.
  filtersRef.value?.clearAll();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

// Listener on window rather than on the panel: clicking the scrim leaves focus
// on <body>, and a keydown handler bound to the panel would never see it.
watch(
  () => store.filtersOpen,
  (open) => {
    if (!import.meta.client) return;
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      window.addEventListener("keydown", onKeydown);
      void nextTick(() => panelRef.value?.focus());
    } else {
      window.removeEventListener("keydown", onKeydown);
    }
  },
);

onUnmounted(() => {
  if (!import.meta.client) return;
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 200ms ease;
}
.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 200ms ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .drawer-enter-from .drawer-panel,
  .drawer-leave-to .drawer-panel {
    transform: translateX(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active,
  .drawer-leave-active,
  .drawer-enter-active .drawer-panel,
  .drawer-leave-active .drawer-panel {
    transition: none;
  }
  .drawer-enter-from .drawer-panel,
  .drawer-leave-to .drawer-panel {
    transform: none;
  }
}
</style>

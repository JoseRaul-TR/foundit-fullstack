<!-- apps/web/app/components/media-detail/MediaDetailsModal.vue -->
<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-page/80 px-4 py-8 backdrop-blur-sm sm:py-12"
      @click.self="close"
    >
      <!-- Declared as a dialog, which it wasn't: a screen reader read it as
           more page content, and Tab walked straight out of it and into the
           page behind the scrim. The filter drawer in Discover already worked
           this way, so the two overlays behaved differently for no reason. -->
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('mediaDetail.dialogLabel')"
        tabindex="-1"
        class="relative w-full max-w-3xl rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none"
      >
        <div
          class="sticky top-4 z-20 flex items-center justify-between px-4 sm:px-6"
        >
          <button
            v-if="canGoBack"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-page/80 text-primary shadow-md backdrop-blur-md transition hover:border-border hover:bg-page"
            :aria-label="$t('common.back')"
            @click="back"
          >
            <svg
              class="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span v-else />

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-page/80 text-primary shadow-md backdrop-blur-md transition hover:border-border hover:bg-page"
            :aria-label="$t('common.close')"
            @click="close"
          >
            <svg
              class="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="-mt-[52px]">
          <template v-if="current">
            <MovieDetailContent
              v-if="current.mediaType === 'movie'"
              :key="`movie-${current.id}`"
              :id="current.id"
            />
            <SeriesDetailContent
              v-else-if="current.mediaType === 'series'"
              :key="`series-${current.id}`"
              :id="current.id"
            />
            <PersonDetailContent
              v-else
              :key="`person-${current.id}`"
              :id="current.id"
            />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { isOpen, current, canGoBack, back, close } = useMediaModal();
const route = useRoute();

const panelRef = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

// The modal's state lives in a store, not in the URL, so nothing dismisses it
// when the route changes and it stays open on top of whatever page comes next.
// The 401 redirect is just where this became visible; it happens on any
// navigation.
//
// If the modal is ever made URL-addressable, this relationship inverts -- the
// route would drive the modal instead of merely dismissing it -- and this
// watcher has to go.
watch(
  () => route.fullPath,
  () => {
    if (isOpen.value) close();
  },
);

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Queried on every Tab rather than cached: the contents arrive asynchronously
// and sections open and close, so the set of focusable elements changes while
// the dialog is on screen.
function focusableItems(): HTMLElement[] {
  const root = panelRef.value;
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (el) => el.offsetParent !== null,
  );
}

function handleKeydown(event: KeyboardEvent) {
  if (!isOpen.value) return;

  if (event.key === "Escape") {
    close();
    return;
  }
  if (event.key !== "Tab") return;

  const items = focusableItems();
  if (items.length === 0) {
    event.preventDefault();
    panelRef.value?.focus();
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const inside = panelRef.value?.contains(active) ?? false;

  if (event.shiftKey && (!inside || active === first)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault();
    first?.focus();
  }
}

watch(isOpen, (open) => {
  if (!import.meta.client) return;

  if (open) {
    // Remembered so focus can go back where it was. Opening from a card and
    // being returned to the top of the document is disorienting, and with a
    // grid of twenty cards it means finding your place again by hand.
    previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    void nextTick(() => panelRef.value?.focus());
  } else {
    document.body.style.overflow = "";
    previouslyFocused?.focus();
    previouslyFocused = null;
  }
});

onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  if (import.meta.client) document.body.style.overflow = "";
});
</script>

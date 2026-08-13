<!-- apps/web/app/components/media-detail/HorizontalScrollRow.vue -->
<!-- The one horizontal row. DiscoverRow used to be a copy of this file plus a
     sentinel, on the grounds that cast and crew never paginate — they do now,
     and the two copies had already drifted: Discover's had a proportional
     runway and different edge padding, this one had neither. Pagination is
     opt-in through `hasMore`, so a row that doesn't need it renders no
     sentinel and creates no observer work. -->
<template>
  <div class="relative">
    <button
      v-if="canScrollLeft"
      type="button"
      class="absolute left-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-page/80 text-primary shadow-lg ring-1 ring-inset ring-white/10 backdrop-blur-md transition hover:bg-page sm:flex"
      :aria-label="$t('common.scrollPrevious')"
      @click="scrollBy(-1)"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>

    <div
      ref="scrollerRef"
      class="flex gap-4 overflow-x-auto scroll-smooth pb-1"
      :class="scrollerClass"
      @scroll="updateScrollState"
    >
      <slot />
      <div
        v-if="hasMore"
        ref="sentinelRef"
        class="flex w-16 shrink-0 items-center justify-center"
      >
        <span v-if="loading" class="text-xs text-secondary">{{
          $t("common.loadingMore")
        }}</span>
      </div>
    </div>

    <button
      v-if="canScrollRight"
      type="button"
      class="absolute right-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-page/80 text-primary shadow-lg ring-1 ring-inset ring-white/10 backdrop-blur-md transition hover:bg-page sm:flex"
      :aria-label="$t('common.scrollNext')"
      @click="scrollBy(1)"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    hasMore?: boolean;
    loading?: boolean;
    /**
     * How far past the right edge the sentinel counts as visible, in screen
     * widths. It has to be SHORTER than one batch: the observer only fires
     * when the answer changes, so if a new batch doesn't push the sentinel
     * back out of the extended box, no second notification arrives and the
     * row stops loading. Twenty person cards are about two screens, so 1.5
     * leaves room; Discover's old 2.5 would have stalled on a wide window.
     */
    runway?: number;
    /**
     * The bleed, which belongs to the caller: the modal pads its content by
     * 20/32px and the Discover panel by 16px, and a row that guesses ends up
     * four pixels wider than its container.
     */
    scrollerClass?: string;
  }>(),
  {
    hasMore: false,
    loading: false,
    runway: 1.5,
    scrollerClass: "-mx-5 px-5 sm:-mx-8 sm:px-8",
  },
);

const emit = defineEmits<{ "load-more": [] }>();

const scrollerRef = ref<HTMLElement | null>(null);
const sentinelRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

function updateScrollState() {
  const el = scrollerRef.value;
  if (!el) return;
  canScrollLeft.value = el.scrollLeft > 4;
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
}

function scrollBy(direction: 1 | -1) {
  const el = scrollerRef.value;
  if (!el) return;
  el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
}

let observer: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let observedWidth = 0;

function onIntersect(entries: IntersectionObserverEntry[]) {
  if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
    emit("load-more");
  }
}

/**
 * Rebuilt whenever the root's width changes, because rootMargin is a string
 * fixed at construction and ours is derived from that width. Reading it once
 * at mount is what Discover did, and inside a section that starts closed the
 * width at mount is zero — the runway would be zero for exactly the rows that
 * need one. Same blind spot that kept the arrows hidden before the
 * ResizeObserver went in.
 */
function syncIntersectionObserver() {
  const el = scrollerRef.value;
  if (!el) return;

  const width = el.clientWidth;
  if (width === 0 || width === observedWidth) return;
  observedWidth = width;

  observer?.disconnect();
  observer = new IntersectionObserver(onIntersect, {
    root: el,
    // Only the right edge matters: the sentinel sits at the end of the row.
    rootMargin: `0px ${Math.round(width * props.runway)}px 0px 0px`,
  });
  if (sentinelRef.value) observer.observe(sentinelRef.value);
}

onMounted(() => {
  updateScrollState();
  syncIntersectionObserver();

  // A ResizeObserver rather than a window resize listener, because the window
  // isn't what changes here. Cast and Crew live inside CollapsableSection,
  // which starts closed with `v-show` — so at mount the row is display:none
  // and both clientWidth and scrollWidth read 0. Opening the section fires no
  // scroll and no resize.
  resizeObserver = new ResizeObserver(() => {
    updateScrollState();
    syncIntersectionObserver();
  });
  if (scrollerRef.value) resizeObserver.observe(scrollerRef.value);

  // The sentinel is behind `v-if`, so it's created and destroyed. observe()
  // points at one node; once Vue replaces it, the old registration is dead.
  watch(
    sentinelRef,
    (el, prevEl) => {
      if (prevEl && observer) observer.unobserve(prevEl);
      if (el && observer) observer.observe(el);
    },
    { immediate: true },
  );
});

onUnmounted(() => {
  observer?.disconnect();
  resizeObserver?.disconnect();
});
</script>

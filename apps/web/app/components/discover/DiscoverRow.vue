<!-- apps/web/app/components/discover/DiscoverRow.vue -->
<!-- Same nav-arrow behavior as media-detail/HorizontalScrollRow.vue, plus
     an IntersectionObserver sentinel at the end that fires load-more when
     scrolled into view — HorizontalScrollRow itself stays untouched since
     Cast/Crew never need pagination. -->
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
      class="-mx-5 flex gap-4 overflow-x-auto scroll-smooth px-5 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0"
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
const props = defineProps<{ hasMore: boolean; loading: boolean }>();
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

onMounted(() => {
  updateScrollState();

  // Same reason as in HorizontalScrollRow: the window isn't what changes.
  // Watching the element itself also catches the card widths changing at a
  // breakpoint, which a window listener only sees by coincidence.
  resizeObserver = new ResizeObserver(() => updateScrollState());
  if (scrollerRef.value) resizeObserver.observe(scrollerRef.value);

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
        emit("load-more");
      }
    },
    {
      root: scrollerRef.value,
      // Only the right edge matters: the sentinel sits at the end of the row
      // and we want it to announce itself before the user reaches it.
      //
      // Proportional rather than a fixed number, because a card is now a
      // fraction of the viewport: 1200px was seven cards of 160px, and only
      // four and a half once a card became a grid column. Two and a half
      // screens of runway keeps the same feel at any size — the fixed figure
      // silently got tighter the moment the cards grew.
      //
      // Read once, at observer creation: resizing the window afterwards does
      // not recompute it. Acceptable, since the margin is generous either way.
      rootMargin: `0px ${Math.round((scrollerRef.value?.clientWidth ?? 0) * 2.5)}px 0px 0px`,
    },
  );

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

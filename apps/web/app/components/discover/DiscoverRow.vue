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
      class="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent/55 text-primary backdrop-blur-sm transition hover:bg-accent/70"
      @click="scrollBy(-1)"
    >
      <svg
        class="h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
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
      class="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent/55 text-primary backdrop-blur-sm transition hover:bg-accent/70"
      @click="scrollBy(1)"
    >
      <svg
        class="h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
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

onMounted(() => {
  updateScrollState();
  window.addEventListener("resize", updateScrollState);

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
        emit("load-more");
      }
    },
    { root: scrollerRef.value, rootMargin: "300px" },
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
  window.removeEventListener("resize", updateScrollState);
  observer?.disconnect();
});
</script>

<!-- apps/web/app/components/media-detail/HorizontalScrollRow.vue -->
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
      class="-mx-5 flex gap-4 overflow-x-auto scroll-smooth px-5 pb-1 sm:-mx-8 sm:px-8"
      @scroll="updateScrollState"
    >
      <slot />
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
const scrollerRef = ref<HTMLElement | null>(null);
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

let observer: ResizeObserver | null = null;

onMounted(() => {
  updateScrollState();

  // A ResizeObserver rather than a window resize listener, because the window
  // isn't what changes here. Cast and Crew live inside CollapsableSection,
  // which starts closed on mobile with `v-show` — so at mount the row is
  // display:none and both clientWidth and scrollWidth read 0. Opening the
  // section fires no scroll and no resize, so the arrows stayed hidden for
  // the rest of the session. The observer fires the moment the element gets
  // a size, whatever caused it.
  observer = new ResizeObserver(() => updateScrollState());
  if (scrollerRef.value) observer.observe(scrollerRef.value);
});

onUnmounted(() => observer?.disconnect());
</script>

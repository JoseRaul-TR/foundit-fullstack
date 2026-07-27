<!-- apps/web/app/components/media-detail/HorizontalScrollRow.vue -->
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
      class="-mx-5 flex gap-4 overflow-x-auto scroll-smooth px-5 pb-1 sm:-mx-8 sm:px-8"
      @scroll="updateScrollState"
    >
      <slot />
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

onMounted(() => {
  updateScrollState();
  window.addEventListener("resize", updateScrollState);
});
onUnmounted(() => window.removeEventListener("resize", updateScrollState));
</script>

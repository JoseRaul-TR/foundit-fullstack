<!-- apps/web/app/components/ui/ScrollSentinel.vue -->
<!-- The vertical counterpart to HorizontalScrollRow's sentinel, with the same
     contract — `hasMore` / `loading` in, `load-more` out — so a list that
     paginates looks the same whichever direction it runs in. It is a separate
     component rather than a shared one because the horizontal row also owns
     arrows, a scroller and a bleed, none of which a page grid has.

     Pagination is opt-in through `hasMore`: a list with nothing left renders
     no sentinel and creates no observer work. -->
<template>
  <div
    v-if="hasMore"
    ref="sentinelRef"
    class="flex h-20 items-center justify-center"
  >
    <span v-if="loading" class="text-sm text-secondary">
      {{ $t("common.loadingMore") }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    hasMore?: boolean;
    loading?: boolean;
    /**
     * How far below the fold the sentinel counts as visible, in pixels. It
     * has to be SHORTER than one batch is tall, for the reason
     * HorizontalScrollRow documents: the observer only fires when the answer
     * changes, so if a new page does not push the sentinel back out of the
     * extended box, no second notification arrives.
     *
     * A page is twenty cards. The narrowest grid is two columns, so ten rows
     * of roughly 250 px; the widest is four, so five rows. 600 px clears both
     * with room to spare.
     */
    runway?: number;
  }>(),
  { hasMore: false, loading: false, runway: 600 },
);

const emit = defineEmits<{ "load-more": [] }>();

const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
        emit("load-more");
      }
    },
    // The root is the viewport and the margin is a fixed number of pixels, so
    // unlike the horizontal row's there is nothing here to rebuild when the
    // window resizes.
    { rootMargin: `0px 0px ${props.runway}px 0px` },
  );

  // The sentinel is behind `v-if`, so it is created and destroyed. observe()
  // points at one node; once Vue replaces it, the old registration is dead.
  watch(
    sentinelRef,
    (el, prevEl) => {
      if (prevEl && observer) observer.unobserve(prevEl);
      if (el && observer) observer.observe(el);
    },
    { immediate: true },
  );

  // The runway is sized so a full page pushes the sentinel back out of view,
  // but a page can arrive short — the last one, or a filter that matches
  // little — and on a tall window the sentinel then never leaves the extended
  // box. An IntersectionObserver reports changes, not states, so no second
  // notification would arrive and the list would stop loading in silence.
  //
  // Re-observing re-delivers the current state, which is the cheap way to ask
  // "are we still at the bottom?" once a load finishes. If the answer is yes
  // it loads again, until the window is full or there is nothing left.
  watch(
    () => props.loading,
    (loading, wasLoading) => {
      if (!wasLoading || loading) return;
      const el = sentinelRef.value;
      if (!el || !observer) return;
      observer.unobserve(el);
      observer.observe(el);
    },
  );
});

onUnmounted(() => observer?.disconnect());
</script>

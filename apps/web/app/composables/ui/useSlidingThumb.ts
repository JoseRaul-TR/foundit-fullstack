// apps/web/app/composables/ui/useSlidingThumb.ts
//
// The measurement behind a sliding indicator: a pill that follows the active
// item instead of the fill jumping between items. Shared by the segmented
// control and the navbar, which need the same movement but not the same
// markup — one is a set of buttons emitting a value, the other a set of links
// that have to stay real links for middle-click, prefetch and crawlers.
//
// Items are found by the `data-thumb-item` attribute rather than by tag, so
// the caller decides what an item is.
//
// Measured rather than computed as 100/n %: the items differ a lot in width
// ("All" vs "People", the logo vs a nav link), and forcing them to a common
// width wastes space. The cost is that there is no measurement during SSR, so
// the caller has to mark the active item some other way until hydration.

export function useSlidingThumb(activeIndex: Ref<number>) {
  const rootRef = ref<HTMLElement | null>(null);
  const thumb = reactive({ left: 0, width: 0, ready: false });
  const animate = ref(false);

  function items(): HTMLElement[] {
    const root = rootRef.value;
    if (!root) return [];
    return [...root.querySelectorAll<HTMLElement>("[data-thumb-item]")];
  }

  function measure() {
    if (!rootRef.value) return;
    const index = activeIndex.value;
    // -1 means nothing here is active — /profile in the navbar, for instance.
    // The thumb disappears rather than sticking to a stale position.
    if (index < 0) {
      thumb.ready = false;
      return;
    }
    const el = items()[index];
    if (!el) return;
    // offsetLeft is relative to the track, which is the offsetParent, so the
    // track's own padding is already accounted for.
    thumb.left = el.offsetLeft;
    thumb.width = el.offsetWidth;
    thumb.ready = true;
  }

  let observer: ResizeObserver | null = null;

  onMounted(() => {
    measure();
    // One frame after the first placement, or the thumb slides in from the
    // left edge every time the component hydrates.
    requestAnimationFrame(() => {
      animate.value = true;
    });

    observer = new ResizeObserver(() => measure());
    const root = rootRef.value;
    if (root) {
      // The track catches font loading and viewport changes; the items catch
      // a label growing on a locale switch, which can leave the track's own
      // width unchanged if another label shrank by the same amount.
      observer.observe(root);
      for (const el of items()) observer.observe(el);
    }
  });

  watch(activeIndex, () => void nextTick(measure));

  onUnmounted(() => observer?.disconnect());

  // measure() is exposed for structural changes — items appearing or
  // disappearing — which the observer cannot see, since it only watches the
  // elements that existed when it was created.
  return { rootRef, thumb, animate, measure };
}

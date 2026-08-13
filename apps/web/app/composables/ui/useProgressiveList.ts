// apps/web/app/composables/ui/useProgressiveList.ts
/**
 * Hands out a long array in batches. The data is already in memory — this
 * decides how much of it becomes DOM.
 *
 * Now that cast and crew arrive uncapped, a big film mounts four hundred
 * cards at once. The images don't download until they're near the viewport,
 * so the cost isn't bandwidth, it's the nodes themselves and the layout pass
 * that creates them. Twenty at a time keeps that pass small, and the row's
 * sentinel asks for the next twenty before the user reaches the end.
 *
 * `step` is also the initial count: there's no reason for the first batch to
 * differ from the rest.
 */

/** Cast and crew: cards are 110px wide, so twenty is about two screens. */
export const PEOPLE_BATCH = 20;

export function useProgressiveList<T>(source: () => T[], step: number) {
  const all = computed(source);
  const count = ref(step);

  // Switching language swaps the array under us without remounting the
  // component, and someone who had scrolled deep into the crew would keep a
  // count that no longer means anything. Opening a different title remounts
  // via :key, so this is only for the in-place case.
  watch(all, () => {
    count.value = step;
  });

  const visible = computed(() => all.value.slice(0, count.value));
  const hasMore = computed(() => count.value < all.value.length);

  function loadMore() {
    if (hasMore.value) count.value += step;
  }

  return { visible, hasMore, loadMore };
}

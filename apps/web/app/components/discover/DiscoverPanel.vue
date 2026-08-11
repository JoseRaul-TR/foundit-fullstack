<!-- apps/web/app/components/discover/DiscoverPanel.vue -->
<template>
  <div class="mt-10 flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4">
    <!-- SectionHeadingRow (wireframe 46:169): title with the filter gear beside
         it. The type selector sits at the far end, mirroring the search
         results row. Wraps on narrow screens so the selector drops to its own
         line instead of squeezing the title. -->
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div class="flex items-center gap-1">
        <h2 class="text-lg font-bold text-primary">
          {{ $t("discover.title") }}
        </h2>
        <DiscoverFilterButton />
      </div>

      <SegmentedControl
        :model-value="activeTabValue"
        :options="tabOptions"
        :aria-label="$t('common.filterByType')"
        @update:model-value="selectTab"
      />
    </div>

    <DiscoverSection
      :title="$t(activeTitleKey)"
      :media-type="activeSectionMediaType"
      :items="activeItems"
      :loading="activeLoading"
      :has-more="activeHasMore"
      @load-more="discover.fetchNextPage(discover.activeMediaType.value)"
    />

    <DiscoverFilterDrawer />
  </div>
</template>

<script setup lang="ts">
const discover = useDiscover();
const { data: profile } = useDiscoverProfile();
const route = useRoute();
const localePath = useLocalePath();
const store = useDiscoverStore();
const { t } = useI18n();

// Singular in the URL to match the vocabulary search already uses there;
// plural internally because that's what the store calls its sections.
type DiscoverTabValue = "movie" | "series";

const tabOptions = computed(() => [
  { value: "movie" as DiscoverTabValue, label: t("discover.typeTabs.movie") },
  { value: "series" as DiscoverTabValue, label: t("discover.typeTabs.series") },
]);

const activeTabValue = computed<DiscoverTabValue>(() =>
  discover.activeMediaType.value === "movies" ? "movie" : "series",
);

const activeTitleKey = computed(() =>
  discover.activeMediaType.value === "movies"
    ? "discover.typeTabs.movie"
    : "discover.typeTabs.series",
);
const activeSectionMediaType = computed(() =>
  discover.activeMediaType.value === "movies" ? "movie" : "series",
);
const activeItems = computed(() =>
  discover.activeMediaType.value === "movies"
    ? discover.movies.value
    : discover.series.value,
);
const activeLoading = computed(() =>
  discover.activeMediaType.value === "movies"
    ? discover.moviesLoading.value
    : discover.seriesLoading.value,
);
const activeHasMore = computed(() =>
  discover.activeMediaType.value === "movies"
    ? discover.moviesHasMore.value
    : discover.seriesHasMore.value,
);

function selectTab(urlValue: DiscoverTabValue) {
  return navigateTo(
    localePath({ path: "/", query: { ...route.query, type: urlValue } }),
  );
}

// Tracked by hand rather than read from the watcher's previous value: on the
// immediate run there isn't one, and relying on watcher creation order to get
// the clearing to happen before the fetch is the kind of assumption that cost
// us an afternoon earlier.
let lastLoadedType: DiscoverMediaType | null = null;

onMounted(() => {
  watch(
    [profile, discover.activeMediaType],
    ([value]) => {
      if (!value) return;
      const type = discover.activeMediaType.value;
      if (lastLoadedType !== null && lastLoadedType !== type) {
        store.clearTypeSpecificFilters();
      }
      lastLoadedType = type;
      void discover.ensureActiveLoaded();
    },
    { immediate: true },
  );
});

// The drawer is a route-independent overlay; leaving it open across a
// navigation would reopen it on the next visit for no reason.
onUnmounted(() => store.closeFilters());
</script>

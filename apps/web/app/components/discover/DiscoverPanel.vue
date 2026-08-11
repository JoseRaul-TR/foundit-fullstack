<!-- apps/web/app/components/discover/DiscoverPanel.vue -->
<template>
  <div
    class="mt-10 flex w-full max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:items-start"
  >
    <aside class="lg:w-72 lg:shrink-0">
      <DiscoverFilters />
    </aside>

    <div class="flex min-w-0 flex-1 flex-col gap-8">
      <div class="flex items-center gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.type"
          type="button"
          class="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition"
          :class="
            discover.activeMediaType.value === tab.type
              ? 'bg-brand font-bold text-page'
              : 'border border-border text-secondary hover:text-primary'
          "
          @click="selectTab(tab.urlValue)"
        >
          {{ $t(tab.labelKey) }}
        </button>
      </div>

      <DiscoverSection
        :title="$t(activeTitleKey)"
        :media-type="activeSectionMediaType"
        :items="activeItems"
        :loading="activeLoading"
        :has-more="activeHasMore"
        @load-more="discover.fetchNextPage(discover.activeMediaType.value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const discover = useDiscover();
const { data: profile } = useDiscoverProfile();
const route = useRoute();
const localePath = useLocalePath();

const tabs = [
  { type: "movies", urlValue: "movie", labelKey: "discover.typeTabs.movie" },
  { type: "series", urlValue: "series", labelKey: "discover.typeTabs.series" },
] as const;

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
function selectTab(urlValue: string) {
  return navigateTo(
    localePath({ path: "/", query: { ...route.query, type: urlValue } }),
  );
}

onMounted(() => {
  watch(
    [profile, discover.activeMediaType],
    ([value]) => {
      if (value) void discover.ensureActiveLoaded();
    },
    { immediate: true },
  );
});
</script>

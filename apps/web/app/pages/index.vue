<!-- apps/web/app/pages/index.vue -->
<template>
  <div class="flex flex-col items-center gap-10 pt-6">
    <div class="flex flex-col items-center gap-3 text-center">
      <h1 class="text-2xl font-bold text-primary sm:text-3xl">{{ appName }}</h1>
      <p class="max-w-md text-sm text-secondary">{{ $t("home.tagline") }}</p>
    </div>

    <SearchBar />

    <LandingPerks v-if="!authStore.isAuthenticated && isIdle" />
    <DiscoverPanel v-if="authStore.isAuthenticated && isIdle" />

    <section v-if="!isIdle" class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-bold text-primary">
          {{ $t("search.resultsTitle") }}
        </h2>
        <SegmentedControl
          v-if="authStore.isAuthenticated"
          :model-value="searchType"
          :options="typeOptions"
          :aria-label="$t('common.filterByType')"
          @update:model-value="changeType"
        />
      </div>

      <div
        v-if="loading && results.length === 0"
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6"
      >
        <div
          v-for="n in 8"
          :key="n"
          class="aspect-[255/383] animate-pulse rounded-[20px] bg-surface-elevated"
        />
      </div>

      <div
        v-else-if="results.length === 0"
        class="flex flex-col items-center gap-2 py-16 text-center"
      >
        <p class="text-base font-semibold text-primary">
          {{ $t("search.noResultsFor", { query: searchQuery }) }}
        </p>
        <p class="text-sm text-secondary">
          {{ $t("search.tryDifferentTerm") }}
        </p>
        <AccountPrompt v-if="!authStore.isAuthenticated" />
      </div>

      <template v-else>
        <div
          class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6"
        >
          <MediaCard
            v-for="item in results"
            :key="`${item.mediaType}-${item.id}`"
            :id="item.id"
            :media-type="item.mediaType"
            :title="item.title"
            :poster-path="item.posterPath"
            :year="item.year"
            :tmdb-rating="item.tmdbRating"
            :genres="
              item.mediaType !== 'person'
                ? getGenreNames(item.genreIds, item.mediaType)
                : undefined
            "
          />
        </div>

        <div
          v-if="hasMore"
          ref="sentinelRef"
          class="flex justify-center py-6 text-sm text-secondary"
        >
          <span v-if="loading">{{ $t("common.loadingMore") }}</span>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { SearchType } from "~/stores/search";

const { public: publicConfig } = useRuntimeConfig();
const appName = publicConfig.appName;

const { t } = useI18n();

const typeOptions = computed(() => [
  { value: "multi" as SearchType, label: t("search.typeTabs.all") },
  { value: "movie" as SearchType, label: t("search.typeTabs.movie") },
  { value: "series" as SearchType, label: t("search.typeTabs.series") },
  { value: "person" as SearchType, label: t("search.typeTabs.person") },
]);

const route = useRoute();
const authStore = useAuthStore();

const {
  isIdle,
  query: searchQuery,
  type: searchType,
  results,
  loading,
  hasMore,
  search: performSearch,
  loadFromQuery,
  fetchNextPage,
} = useSearch();

const { getGenreNames } = useGenres();

const routeQuery = computed(() => route.query.q?.toString() ?? "");
const routeType = computed(
  () => (route.query.type?.toString() as SearchType) || "multi",
);

// SSR-critical: awaited so a direct/shared /?q=... URL has results in the
// initial HTML (curl-testable). Re-runs on client-side query/type changes
// via `watch` — the only place that ever triggers a fetch.
await useAsyncData(
  "search",
  // Returns null rather than nothing: an undefined handler leaves Nuxt with
  // no payload to hand to the client, so the fetch runs a second time while
  // hydrating — the exact duplication the awaited call exists to avoid.
  () => loadFromQuery(routeQuery.value, routeType.value).then(() => null),
  { watch: [routeQuery, routeType] },
);

function changeType(type: SearchType) {
  if (routeQuery.value.trim().length >= 3) {
    performSearch(routeQuery.value, type);
  }
}

// Infinite scroll: a single sentinel element sits right after the grid
// (it doubles as the "Loading more…" indicator slot). When it scrolls
// into view and there's a next page, fetch it — no scroll-event
// listeners, no extra dependency.
const sentinelRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !loading.value) {
        fetchNextPage();
      }
    },
    { rootMargin: "400px" }, // start fetching before the user hits bottom
  );

  watch(
    sentinelRef,
    (el, prevEl) => {
      if (prevEl) observer.unobserve(prevEl);
      if (el) observer.observe(el);
    },
    { immediate: true },
  );

  onUnmounted(() => observer.disconnect());
});
</script>

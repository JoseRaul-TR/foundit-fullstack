<!-- apps/web/app/pages/index.vue -->
<template>
  <div class="flex flex-col items-center gap-10 pt-6">
    <div class="flex flex-col items-center gap-3 text-center">
      <h1 class="text-2xl font-bold text-primary sm:text-3xl">{{ appName }}</h1>
      <p class="max-w-md text-sm text-secondary">{{ $t("home.tagline") }}</p>
    </div>

    <SearchBar />

    <section v-if="!isIdle" class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-bold text-primary">
          {{ $t("search.resultsTitle") }}
        </h2>
        <div v-if="authStore.isAuthenticated" class="flex items-center gap-2">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            class="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition"
            :class="
              searchType === option.value
                ? 'bg-brand font-bold text-page'
                : 'border border-border text-secondary hover:text-primary'
            "
            @click="changeType(option.value)"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>
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
        <p class="text-sm text-secondary">{{ $t("search.tryDifferentTerm") }}</p>
      </div>

      <template v-else>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          <MediaCard
            v-for="item in results"
            :key="`${item.mediaType}-${item.id}`"
            :id="item.id"
            :media-type="item.mediaType"
            :title="item.title"
            :poster-path="item.posterPath"
            :year="item.year"
            :tmdb-rating="item.tmdbRating"
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

const routeQuery = computed(() => route.query.q?.toString() ?? "");
const routeType = computed(
  () => (route.query.type?.toString() as SearchType) || "multi",
);

// SSR-critical: awaited so a direct/shared /?q=... URL has results in the
// initial HTML (curl-testable). Re-runs on client-side query/type changes
// via `watch` — the only place that ever triggers a fetch.
await useAsyncData(
  "search",
  () => loadFromQuery(routeQuery.value, routeType.value),
  { watch: [routeQuery, routeType] },
);

const typeOptions: { value: SearchType; labelKey: string }[] = [
  { value: "multi", labelKey: "search.typeTabs.all" },
  { value: "movie", labelKey: "search.typeTabs.movie" },
  { value: "series", labelKey: "search.typeTabs.series" },
  { value: "person", labelKey: "search.typeTabs.person" },
];

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
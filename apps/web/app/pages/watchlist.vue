<!-- apps/web/app/pages/watchlist.vue -->
<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6">
    <h1 class="text-xl font-bold text-primary">{{ $t("watchlist.title") }}</h1>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        :model-value="params.type"
        :options="tabs"
        size="sm"
        :aria-label="$t('common.filterByType')"
        @update:model-value="setParams({ type: $event })"
      />

      <label
        class="flex w-full flex-col gap-1 text-xs font-medium text-secondary sm:w-auto sm:flex-row sm:items-center sm:gap-2"
      >
        {{ $t("watchlist.sortBy.label") }}
        <SelectControl v-model="sortValue">
          <option
            v-for="option in sortOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </SelectControl>
      </label>
    </div>

    <div
      v-if="query.isPending.value"
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      <div
        v-for="n in 8"
        :key="n"
        class="aspect-[255/383] animate-pulse rounded-[20px] bg-surface-elevated"
      />
    </div>

    <p
      v-else-if="query.isError.value"
      class="rounded-2xl bg-surface-elevated px-4 py-6 text-center text-sm text-secondary"
    >
      {{ $t("watchlist.loadError") }}
    </p>

    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center gap-3 rounded-2xl bg-surface-elevated px-4 py-14 text-center"
    >
      <svg
        class="h-10 w-10 text-secondary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path d="M6 2a2 2 0 0 0-2 2v18l8-5.333L20 22V4a2 2 0 0 0-2-2H6z" />
      </svg>
      <p class="text-base font-bold text-primary">
        {{ $t("watchlist.empty") }}
      </p>
      <p class="max-w-xs text-sm text-secondary">
        {{ $t("watchlist.emptyDescription") }}
      </p>
      <NuxtLink
        :to="localePath('/')"
        class="mt-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-page transition hover:brightness-110"
      >
        {{ $t("watchlist.emptyCta") }}
      </NuxtLink>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MediaCard
          v-for="(item, i) in items"
          :key="`${item.mediaType}-${item.tmdbId}`"
          :eager="i < 4"
          :priority="i === 0"
          :id="item.tmdbId"
          :media-type="item.mediaType"
          :title="item.tmdb.title"
          :poster-path="item.tmdb.posterPath"
          :year="item.tmdb.year"
          :tmdb-rating="item.tmdb.tmdbRating"
          :subscribed="item.highlight.available"
          :provider="item.highlight.services[0]?.name ?? null"
          :new-season="item.newSeasonsAvailable ?? false"
        />
      </div>

      <ScrollSentinel
        :has-more="query.hasNextPage.value"
        :loading="query.isFetchingNextPage.value"
        @load-more="query.fetchNextPage()"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";

definePageMeta({ middleware: "authenticated" });

const { apiFetch } = useApi();
const queryClient = useQueryClient();

// Read before the await. A composable called after an await in setup has lost
// its Nuxt instance and returns nothing useful without throwing (#211) — and
// the prefetch's key has to be the one useWatchlistQuery will read, or the
// payload ships full under a key nobody looks at (#192). useListParams reads
// the route, so it is under the same rule.
const { locale } = useLocale();
const { params, setParams, sortValue } = useListParams(
  WATCHLIST_SORTS,
  DEFAULT_WATCHLIST_SORT,
);

// prefetchInfiniteQuery fetches the first page only. That is the change #234
// exists for: SSR used to enrich the whole list from TMDB before it could
// answer, and now it enriches twenty.
//
// media-state comes along because every MediaCard reads it, and because it
// runs during SSR regardless — see the note in useMediaState.ts. Awaiting it
// is what makes the rendered HTML and the serialized payload agree.
if (import.meta.server) {
  await Promise.all([
    queryClient.prefetchInfiniteQuery(
      watchlistQueryOptions(apiFetch, locale.value, params.value),
    ),
    queryClient.prefetchQuery(mediaStateQueryOptions(apiFetch)),
  ]);
}

const { t } = useI18n();
const localePath = useLocalePath();

const query = useWatchlistQuery(params);

const items = computed(
  () => query.data.value?.pages.flatMap((page) => page.results) ?? [],
);

const tabs = computed(() => [
  { value: "all" as const, label: t("common.typeFilter.all") },
  { value: "movie" as const, label: t("common.typeFilter.movie") },
  { value: "series" as const, label: t("common.typeFilter.series") },
]);

// Field and direction in one control. The sorting itself moved to the server
// in #234 — including by title, which was dropped rather than kept: the stored
// title is English by construction while the displayed ones are localised
// (#189), and ordering by the localised one needs the whole list in memory,
// which is the cost pagination exists to avoid.
const sortOptions = computed(() => [
  { value: "added:desc", label: t("watchlist.sortBy.addedDesc") },
  { value: "added:asc", label: t("watchlist.sortBy.addedAsc") },
  { value: "year:desc", label: t("watchlist.sortBy.yearDesc") },
  { value: "year:asc", label: t("watchlist.sortBy.yearAsc") },
]);

// Changing a filter starts a different query at page one, so staying scrolled
// where the previous list happened to reach means landing in the middle of a
// list the user has not seen the top of.
watch(params, () => {
  if (import.meta.client) window.scrollTo({ top: 0, behavior: "instant" });
});
</script>

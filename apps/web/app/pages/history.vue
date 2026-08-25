<!-- apps/web/app/pages/history.vue -->
<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6">
    <h1 class="text-xl font-bold text-primary">{{ $t("history.title") }}</h1>

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
        {{ $t("history.sortBy.label") }}
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
      {{ $t("history.loadError") }}
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
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
      <p class="text-base font-bold text-primary">{{ $t("history.empty") }}</p>
      <p class="max-w-xs text-sm text-secondary">
        {{ $t("history.emptyDescription") }}
      </p>
      <NuxtLink
        :to="localePath('/')"
        class="mt-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-page transition hover:brightness-110"
      >
        {{ $t("history.emptyCta") }}
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
          :title="item.title"
          :poster-path="item.posterPath"
          :year="item.year"
          :tmdb-rating="null"
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

// Before the await — see the note in watchlist.vue (#211, #192).
const { locale } = useLocale();
const { params, setParams, sortValue } = useListParams(
  HISTORY_SORTS,
  DEFAULT_HISTORY_SORT,
);

// prefetchInfiniteQuery fetches the first page only. This page used to fetch
// every page of movies and every page of series and merge them here, which
// meant fourteen requests and 265 TMDB calls before the first byte — and, on
// the deployed build, a pool of ten connections exhausted at the auth
// middleware, a prefetch that failed, and eight skeleton cards (#234, #254).
//
// media-state comes along because every MediaCard reads it, and because it
// runs during SSR regardless — see the note in useMediaState.ts. Awaiting it
// is what makes the rendered HTML and the serialized payload agree.
if (import.meta.server) {
  await Promise.all([
    queryClient.prefetchInfiniteQuery(
      historyQueryOptions(apiFetch, locale.value, params.value),
    ),
    queryClient.prefetchQuery(mediaStateQueryOptions(apiFetch)),
  ]);
}

const { t } = useI18n();
const localePath = useLocalePath();

const query = useHistoryQuery(params);

const items = computed(
  () => query.data.value?.pages.flatMap((page) => page.results) ?? [],
);

const tabs = computed(() => [
  { value: "all" as const, label: t("common.typeFilter.all") },
  { value: "movie" as const, label: t("common.typeFilter.movie") },
  { value: "series" as const, label: t("common.typeFilter.series") },
]);

// One field and two directions, in the same control the watchlist uses. The
// history has one date worth sorting by, so the difference between the two
// pages is two options rather than a different mechanism.
const sortOptions = computed(() => [
  { value: "watched:desc", label: t("history.sortBy.watchedDesc") },
  { value: "watched:asc", label: t("history.sortBy.watchedAsc") },
]);

// See watchlist.vue: a new filter is a new query at page one, and staying
// scrolled where the old list reached lands the user mid-way down a list they
// have not seen the top of.
watch(params, () => {
  if (import.meta.client) window.scrollTo({ top: 0, behavior: "instant" });
});
</script>

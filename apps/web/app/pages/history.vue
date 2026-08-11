<!-- apps/web/app/pages/history.vue -->
<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6">
    <h1 class="text-xl font-bold text-primary">{{ $t("history.title") }}</h1>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        v-model="filterType"
        :options="tabs"
        size="sm"
        :aria-label="$t('common.filterByType')"
      />

      <label class="flex items-center gap-2 text-xs font-medium text-secondary">
        {{ $t("watchlist.sortBy.label") }}
        <select
          v-model="sortBy"
          class="rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-xs text-primary"
        >
          <option value="watched">{{ $t("history.sortBy.watched") }}</option>
          <option value="title">{{ $t("watchlist.sortBy.title") }}</option>
        </select>
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
      v-else-if="filteredSorted.length === 0"
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

    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <MediaCard
        v-for="item in filteredSorted"
        :key="`${item.mediaType}-${item.tmdbId}`"
        :id="item.tmdbId"
        :media-type="item.mediaType"
        :title="item.title"
        :poster-path="item.posterPath"
        :year="item.year"
        :tmdb-rating="null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "authenticated" });

const { t } = useI18n();
const localePath = useLocalePath();

const query = useHistoryQuery();

const filterType = ref<"all" | "movie" | "series">("all");
const sortBy = ref<"watched" | "title">("watched");

const tabs = computed(() => [
  { value: "all" as const, label: t("watchlist.typeFilter.all") },
  { value: "movie" as const, label: t("watchlist.typeFilter.movie") },
  { value: "series" as const, label: t("watchlist.typeFilter.series") },
]);

const filteredSorted = computed(() => {
  const items = query.data.value ?? [];
  const filtered =
    filterType.value === "all"
      ? items
      : items.filter((i) => i.mediaType === filterType.value);

  const sorted = [...filtered];
  if (sortBy.value === "title") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    sorted.sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime(),
    );
  }
  return sorted;
});
</script>

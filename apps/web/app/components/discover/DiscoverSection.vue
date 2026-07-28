<!-- apps/web/app/components/discover/DiscoverSection.vue -->
<template>
  <section class="flex flex-col gap-3">
    <h2 class="text-lg font-bold text-primary">{{ title }}</h2>

    <div
      v-if="loading && items.length === 0"
      class="flex gap-4 overflow-hidden"
    >
      <div
        v-for="n in 6"
        :key="n"
        class="aspect-[255/383] w-[160px] shrink-0 animate-pulse rounded-[20px] bg-surface-elevated"
      />
    </div>

    <p v-else-if="items.length === 0" class="text-sm text-secondary">
      {{ $t("discover.noResults") }}
    </p>

    <DiscoverRow
      v-else
      :has-more="hasMore"
      :loading="loading"
      @load-more="$emit('load-more')"
    >
      <div v-for="item in items" :key="item.id" class="w-[160px] shrink-0">
        <MediaCard
          :id="item.id"
          :media-type="mediaType"
          :title="item.title"
          :poster-path="item.posterPath"
          :year="item.year"
          :tmdb-rating="item.tmdbRating"
          :genres="getGenreNames(item.genreIds, mediaType)"
        />
      </div>
    </DiscoverRow>
  </section>
</template>

<script setup lang="ts">
import type { NormalizedSearchResult } from "@foundit/types";
import DiscoverRow from "./DiscoverRow.vue";

defineProps<{
  title: string;
  mediaType: "movie" | "series";
  items: NormalizedSearchResult[];
  loading: boolean;
  hasMore: boolean;
}>();
defineEmits<{ "load-more": [] }>();

const { getGenreNames } = useGenres();
</script>

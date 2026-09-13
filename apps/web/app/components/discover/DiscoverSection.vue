<!-- apps/web/app/components/discover/DiscoverSection.vue -->
<template>
  <section class="flex flex-col gap-3">
    <!-- The type pills above name the section visually; this keeps the
         document outline intact for screen readers without repeating it. -->
    <h2 class="sr-only">{{ title }}</h2>
    <div
      v-if="loading && items.length === 0"
      class="flex gap-4 overflow-hidden"
    >
      <div
        v-for="n in 6"
        :key="n"
        class="aspect-[255/383] w-[calc((100%-1rem)/2)] shrink-0 animate-pulse rounded-[20px] bg-surface-elevated sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
      />
    </div>

    <p v-else-if="items.length === 0" class="text-sm text-secondary">
      {{ $t("discover.noResults") }}
    </p>

    <!-- The bleed follows the page container's gutter, not this panel's —
         since #323 the panel has none, so Discover and the search results
         share one width. 16px below sm and 24px from sm, matching
         layouts/default.vue's `px-4 sm:px-6`, so the cards run exactly to the
         container edge instead of stopping 8px short. It ends at lg, where
         the container reaches max-w-container and the gutter stops being a
         gutter. -->
    <HorizontalScrollRow
      v-else
      :has-more="hasMore"
      :loading="loading"
      scroller-class="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      @load-more="$emit('load-more')"
    >
      <!-- One column of the surrounding grid, computed the way the grid does
           it: total width minus the gaps, divided by the column count. The
           percentage resolves against the scroller's visible width, so the
           carousel and the grids agree at every breakpoint without either
           knowing about the other. -->
      <div
        v-for="item in items"
        :key="item.id"
        class="w-[calc((100%-1rem)/2)] shrink-0 sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
      >
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
    </HorizontalScrollRow>
  </section>
</template>

<script setup lang="ts">
import type { NormalizedSearchResult } from "@foundit/types";

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

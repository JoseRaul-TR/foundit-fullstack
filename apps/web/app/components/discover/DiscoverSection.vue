<!-- apps/web/app/components/discover/DiscoverSection.vue -->
<template>
  <section class="flex flex-col gap-3">
    <!-- The type pills above name the section visually; this keeps the
         document outline intact for screen readers without repeating it. -->
    <h3 class="sr-only">{{ title }}</h3>
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

    <DiscoverRow
      v-else
      :has-more="hasMore"
      :loading="loading"
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

<!-- apps/web/app/components/discover/DiscoverPanel.vue -->
<template>
  <div
    class="mt-10 flex w-full max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:items-start"
  >
    <aside class="lg:w-72 lg:shrink-0">
      <DiscoverFilters />
    </aside>
    <div class="flex flex-1 flex-col gap-8">
      <DiscoverSection
        :title="$t('discover.typeTabs.movie')"
        media-type="movie"
        :items="discover.movies.value"
        :loading="discover.moviesLoading.value"
        :has-more="discover.moviesHasMore.value"
        @load-more="discover.fetchNextPage('movies')"
      />
      <DiscoverSection
        :title="$t('discover.typeTabs.series')"
        media-type="series"
        :items="discover.series.value"
        :loading="discover.seriesLoading.value"
        :has-more="discover.seriesHasMore.value"
        @load-more="discover.fetchNextPage('series')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DiscoverFilters from "./DiscoverFilters.vue";
import DiscoverSection from "./DiscoverSection.vue";

const discover = useDiscover();
useDiscoverProfile();

await useAsyncData("discover-initial", () => discover.loadInitial());
</script>

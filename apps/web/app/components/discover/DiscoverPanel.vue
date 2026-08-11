<!-- apps/web/app/components/discover/DiscoverPanel.vue -->
<template>
  <div
    class="mt-10 flex w-full max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:items-start"
  >
    <aside class="lg:w-72 lg:shrink-0">
      <DiscoverFilters />
    </aside>
    <div class="flex min-w-0 flex-1 flex-col gap-8">
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
const discover = useDiscover();
const { data: profile } = useDiscoverProfile();

// Client-only on purpose. Discover is personalised — it filters by the user's
// platforms and can exclude what they've watched — and server-rendering it
// produced neither. The SSR request carries no session cookie, so the API
// answers as an anonymous caller and `userId` is null; and profileStore is
// still empty at that point, so buildRegionsParam() returns undefined and the
// backend falls back to its unfiltered path. The result was an unfiltered
// first page that nothing ever replaced, because useAsyncData caches the
// payload and the profile arriving later triggered no refetch.
//
// Nothing is lost by not rendering it on the server: the panel only exists for
// authenticated users, so no crawler ever reaches it.
//
// Waiting on the query's data rather than on isPending: measured, isPending
// drops one tick before useProfileQuery's own watcher has written the result
// into profileStore, so a fetch triggered by it still finds an empty store and
// sends no regions at all. `data` is the signal that actually matters.
onMounted(() => {
  watch(
    profile,
    (value) => {
      if (value) void discover.loadInitial();
    },
    { immediate: true },
  );
});
</script>

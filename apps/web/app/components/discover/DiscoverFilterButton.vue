<!-- apps/web/app/components/discover/DiscoverFilterButton.vue -->
<!-- SectionHeadingRow > FilterButtonWrap in the wireframe (Figma 46:171):
     gear icon with a count badge pinned to its top-right corner. -->
<template>
  <button
    type="button"
    class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition hover:text-primary"
    :aria-label="label"
    :aria-expanded="store.filtersOpen"
    aria-controls="discover-filter-drawer"
    :aria-haspopup="'dialog'"
    @click="store.toggleFilters()"
  >
    <svg
      class="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>

    <span
      v-if="count > 0"
      class="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-page"
      aria-hidden="true"
      >{{ count }}</span
    >
  </button>
</template>

<script setup lang="ts">
const store = useDiscoverStore();
const { t } = useI18n();

const count = computed(() => store.activeFilterCount);

const label = computed(() =>
  count.value > 0
    ? `${t("discover.filters.toggle")} — ${t("discover.filters.activeCount", { count: count.value })}`
    : t("discover.filters.toggle"),
);
</script>

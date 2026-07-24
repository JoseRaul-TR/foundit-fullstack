<!-- apps/web/app/components/MediaCard.vue -->
<template>
  <button
    type="button"
    class="group relative flex aspect-[255/383] w-full flex-col justify-end overflow-hidden rounded-[20px] text-left transition hover:brightness-110"
    @click="mediaModal.open(id, mediaType)"
  >
    <img
      v-if="posterUrl"
      :src="posterUrl"
      :alt="title"
      class="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
    />
    <div
      v-else
      class="absolute inset-0 flex items-center justify-center bg-surface-elevated"
    >
      <svg
        class="h-10 w-10 text-border"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>

    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-page/90 via-page/40 to-transparent backdrop-blur-[2px]"
    />

    <div class="relative flex flex-col gap-1 p-3.5">
      <p
        v-if="subscribed && provider"
        class="truncate text-xs font-semibold text-success"
      >
        {{ provider }}
      </p>
      <p class="truncate text-base font-semibold text-primary">{{ title }}</p>
      <p class="truncate text-[13px] text-secondary">
        <template v-if="year">{{ year }}<span class="px-1">·</span></template>
        <span>{{ mediaTypeLabel }}</span>
        <template v-if="hasRating">
          <span class="px-1">·</span>
          <span class="font-bold text-brand">★ {{ formattedRating }}</span>
        </template>
      </p>
    </div>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: number;
  mediaType: "movie" | "series" | "person";
  title: string;
  posterPath: string | null;
  year: number | null;
  tmdbRating: number | null;
  subscribed?: boolean;
  provider?: string | null;
}>();

const { t } = useI18n();
const mediaModal = useMediaModal();

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const posterUrl = computed(() =>
  props.posterPath ? `${TMDB_IMAGE_BASE}${props.posterPath}` : null,
);
const mediaTypeLabel = computed(() => t(`common.mediaType.${props.mediaType}`));
const hasRating = computed(
  () => props.tmdbRating !== null && props.tmdbRating > 0,
);
const formattedRating = computed(() =>
  props.tmdbRating ? props.tmdbRating.toFixed(1) : "",
);
</script>

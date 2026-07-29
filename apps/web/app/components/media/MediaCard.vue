<template>
  <div
    class="group flex w-full flex-col gap-2 text-left"
    role="button"
    tabindex="0"
    @click="mediaModal.open(id, mediaType)"
    @keydown.enter="mediaModal.open(id, mediaType)"
    @keydown.space.prevent="mediaModal.open(id, mediaType)"
  >
    <div
      class="relative aspect-[255/383] w-full overflow-hidden rounded-[20px] bg-surface-elevated"
    >
      <img
        v-if="posterUrl"
        :src="posterUrl"
        :alt="title"
        class="h-full w-full object-cover transition group-hover:brightness-110"
        loading="lazy"
      />
      <div v-else class="flex h-full w-full items-center justify-center">
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
      <span
        v-if="subscribed && provider"
        class="absolute left-2 top-2 rounded-full bg-success/90 px-2 py-1 text-[10px] font-bold text-page shadow"
      >
        {{ provider }}
      </span>
      <NewSeasonBadge
        v-else-if="newSeason"
        class="absolute left-2 top-2 shadow"
      />
      <button
        v-if="removable"
        type="button"
        class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-page/70 text-brand backdrop-blur-sm transition hover:brightness-110 disabled:opacity-50"
        :disabled="removing"
        :aria-label="$t('watchlist.remove')"
        @click.stop="$emit('remove')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 2a2 2 0 0 0-2 2v18l8-5.333L20 22V4a2 2 0 0 0-2-2H6z" />
        </svg>
      </button>
      <span
        v-else
        class="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-page/70 text-primary backdrop-blur-sm"
      >
        <svg
          v-if="mediaType === 'movie'"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path
            d="M3 7l1.5-3h3L6 7M9.5 7l1-3h3l-1 3M15 7l1-3h3l-1.5 3M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z"
          />
        </svg>
        <svg
          v-else-if="mediaType === 'series'"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M8 21h8M12 18v3" />
        </svg>
        <svg
          v-else
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
        </svg>
      </span>
    </div>
    <div class="flex flex-col gap-0.5 px-0.5">
      <p class="truncate text-sm font-semibold text-primary">{{ title }}</p>
      <p v-if="metaLine" class="truncate text-xs text-secondary">
        {{ metaLine }}
      </p>
      <p v-if="ratingLine" class="truncate text-xs text-secondary">
        {{ ratingLine }}
      </p>
    </div>
  </div>
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
  newSeason?: boolean;
  genres?: string[];
  ageRating?: string | null;
  removable?: boolean;
  removing?: boolean;
}>();
const emit = defineEmits<{ remove: [] }>();

const mediaModal = useMediaModal();
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const posterUrl = computed(() =>
  props.posterPath ? `${TMDB_IMAGE_BASE}${props.posterPath}` : null,
);

const metaLine = computed(() => {
  const parts: string[] = [];
  if (props.year) parts.push(String(props.year));
  if (props.genres?.length) parts.push(props.genres.slice(0, 2).join(", "));
  return parts.join(" · ");
});

const hasRating = computed(
  () => props.tmdbRating !== null && props.tmdbRating > 0,
);

const ratingLine = computed(() => {
  const parts: string[] = [];
  if (props.ageRating) parts.push(props.ageRating);
  if (hasRating.value) parts.push(`★ ${props.tmdbRating!.toFixed(1)}`);
  return parts.join(" · ");
});
</script>

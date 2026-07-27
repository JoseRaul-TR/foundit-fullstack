<!-- apps/web/app/components/media/SeasonList.vue -->
<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="season in sortedSeasons"
      :key="season.seasonNumber"
      class="flex items-center gap-3 rounded-full bg-surface-elevated px-4 py-3.5"
    >
      <img
        v-if="season.posterPath"
        :src="`${TMDB_IMAGE_BASE}${season.posterPath}`"
        :alt="`Season ${season.seasonNumber}`"
        class="h-10 w-7 shrink-0 rounded object-cover"
      />
      <div class="flex min-w-0 flex-1 flex-col">
        <span
          class="flex items-center gap-2 truncate text-sm font-medium text-primary"
        >
          {{
            $t("mediaDetail.seasonLabel", {
              number: season.seasonNumber,
              count: season.episodeCount,
            })
          }}
          <NewSeasonBadge v-if="isNewSeason(season)" />
        </span>
        <span v-if="season.airDate" class="text-xs text-secondary">{{
          formatDate(season.airDate)
        }}</span>
      </div>

      <button
        v-if="showWatchedButton"
        type="button"
        class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition"
        :class="
          isWatched(season.seasonNumber)
            ? 'bg-success/[0.14] text-success'
            : 'bg-white/[0.08] text-primary'
        "
        :disabled="isPending(season.seasonNumber)"
        @click="$emit('toggle-watched', season.seasonNumber)"
      >
        <span
          class="grid h-[22px] w-[22px] place-items-center rounded-[11px] border-[1.5px]"
          :class="
            isWatched(season.seasonNumber)
              ? 'border-success bg-success'
              : 'border-secondary'
          "
        >
          <span
            v-if="isWatched(season.seasonNumber)"
            class="text-[10px] text-page"
            >✓</span
          >
        </span>
        {{
          isWatched(season.seasonNumber)
            ? $t("mediaDetail.watched")
            : $t("mediaDetail.markSeasonWatched")
        }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SeriesSeasonSummary } from "@foundit/types";

const props = defineProps<{
  seasons: SeriesSeasonSummary[];
  newSeasonsAvailable: boolean;
  showWatchedButton: boolean;
  isWatched: (seasonNumber: number) => boolean;
  isPending: (seasonNumber: number) => boolean;
}>();

defineEmits<{ "toggle-watched": [seasonNumber: number] }>();

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w154";

// Acceptance criteria #65: "Seasons sorted by season number ascending"
const sortedSeasons = computed(() =>
  [...props.seasons].sort((a, b) => a.seasonNumber - b.seasonNumber),
);

const highestSeasonNumber = computed(() =>
  props.seasons.reduce((max, s) => Math.max(max, s.seasonNumber), -Infinity),
);

// La API solo expone newSeasonsAvailable/availableOn a nivel de serie, no
// por temporada -- el badge se asigna a la temporada más reciente sin ver.
function isNewSeason(season: SeriesSeasonSummary): boolean {
  return (
    props.newSeasonsAvailable &&
    season.seasonNumber === highestSeasonNumber.value &&
    !props.isWatched(season.seasonNumber)
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
}
</script>

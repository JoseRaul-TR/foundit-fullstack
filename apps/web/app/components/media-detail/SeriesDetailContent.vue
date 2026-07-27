<!-- apps/web/app/components/media-detail/SeriesDetailContent.vue -->
<template>
  <div v-if="pending" class="flex min-h-[320px] items-center justify-center p-8">
    <p class="text-sm text-secondary">{{ $t("common.loading") }}</p>
  </div>

  <div v-else-if="error || !series" class="flex min-h-[320px] items-center justify-center p-8">
    <p class="text-sm text-secondary">{{ $t("mediaDetail.loadError") }}</p>
  </div>

  <div v-else class="flex flex-col">
    <div class="relative h-40 w-full overflow-hidden rounded-t-2xl sm:h-[360px]">
      <img
        v-if="backdropUrl"
        :src="backdropUrl"
        :alt="series.title"
        class="h-full w-full object-cover"
      />
      <div class="absolute inset-x-0 bottom-0 h-[39%] bg-gradient-to-t from-page to-transparent" />
    </div>

    <div class="flex flex-col gap-6 px-5 pb-6 pt-0 sm:px-8">
      <div class="mt-16 flex flex-col gap-4 sm:pt-10 sm:flex-row sm:gap-6">
        <div
          class="h-[210px] w-[140px] shrink-0 self-center overflow-hidden rounded-xl bg-surface-elevated shadow-lg sm:h-[300px] sm:w-[200px] sm:self-end"
        >
          <img
            v-if="posterUrl"
            :src="posterUrl"
            :alt="series.title"
            class="h-full w-full object-contain"
          />
        </div>
        <div class="flex flex-1 flex-col gap-2 text-center sm:pb-2 sm:text-left">
          <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 class="text-xl font-bold text-primary sm:text-2xl">
              {{ series.title }}
            </h2>
            <StatusBadge :status="series.status" />
            <span
              v-if="series.ageRating"
              class="rounded border border-border px-1.5 py-0.5 text-[11px] font-bold text-secondary"
            >
              {{ series.ageRating }}
            </span>
          </div>
          <p class="text-sm text-secondary">
            <template v-if="series.releaseYear"
              >{{ $t("mediaDetail.firstAired", { year: series.releaseYear }) }}<span class="px-1.5">·</span></template
            >
            {{ $t("mediaDetail.seasonsCount", { count: series.numberOfSeasons }) }}
            <span class="px-1.5">·</span>
            {{ series.genres.map((g) => g.name).join(", ") }}
          </p>
          <p v-if="hasTmdbRating" class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span class="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
              TMDB
            </span>
            <span class="text-sm font-bold text-brand">
              ★ {{ series.tmdbRating!.toFixed(1) }}
              <span class="font-normal text-secondary">· {{ formattedVoteCount }} {{ $t("mediaDetail.votes") }}</span>
            </span>
          </p>
          <p v-if="series.newSeasonsAvailable" class="text-xs font-bold text-accent">
            {{ $t("mediaDetail.newSeasonAvailable", { services: series.availableOn.join(", ") }) }}
          </p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3 border-y border-border py-4 sm:flex-row sm:justify-between">
        <div v-if="authStore.isAuthenticated" class="flex flex-wrap items-center justify-center gap-2.5">
          <WatchlistButton
            :active="inWatchlist"
            :pending="watchlistPending"
            @toggle="toggleWatchlist"
          />
          <button
            type="button"
            class="rounded-full border border-border px-4 py-2 text-sm font-medium text-primary transition hover:border-accent disabled:opacity-50"
            :disabled="markingAllWatched || allSeasonsWatched"
            @click="markAllSeasonsWatched"
          >
            {{ allSeasonsWatched ? $t("mediaDetail.watched") : $t("mediaDetail.markWatched") }}
          </button>
        </div>
        <p v-else class="text-center text-[13px] text-secondary">
          {{ $t("mediaDetail.loginToTrackSeries") }}
        </p>
      </div>

      <p class="text-sm leading-relaxed text-primary">
        {{ series.overview || $t("mediaDetail.noOverview") }}
      </p>

      <CollapsableSection :title="$t('mediaDetail.seasons')">
        <SeasonList
          :seasons="series.seasons"
          :new-seasons-available="series.newSeasonsAvailable"
          :show-watched-button="authStore.isAuthenticated"
          :is-watched="isSeasonWatched"
          :is-pending="isSeasonPending"
          @toggle-watched="toggleSeasonWatched"
        />
      </CollapsableSection>

      <CollapsableSection v-if="series.trailer" :title="$t('mediaDetail.trailer')">
        <TrailerEmbed :youtube-key="series.trailer.youtubeKey" />
      </CollapsableSection>

      <CollapsableSection v-if="series.cast.length" :title="$t('mediaDetail.cast')">
        <HorizontalScrollRow>
          <PersonCard
            v-for="member in series.cast"
            :key="member.id"
            :id="member.id"
            :name="member.name"
            :profile-path="member.profilePath"
            :role-label="member.character"
          />
        </HorizontalScrollRow>
      </CollapsableSection>

      <CollapsableSection v-if="series.crew.length" :title="$t('mediaDetail.crew')">
        <HorizontalScrollRow>
          <PersonCard
            v-for="member in series.crew"
            :key="`${member.id}-${member.job}`"
            :id="member.id"
            :name="member.name"
            :profile-path="member.profilePath"
            :role-label="member.job"
          />
        </HorizontalScrollRow>
      </CollapsableSection>

      <CollapsableSection :title="$t('mediaDetail.whereToWatch')">
        <ProvidersSection :providers="series.providers" />
      </CollapsableSection>

      <section
        v-if="authStore.isAuthenticated && series.recommendations.length"
        class="flex flex-col gap-3"
      >
        <h3 class="text-base font-bold text-primary">
          {{ $t("mediaDetail.recommendations") }}
        </h3>
        <div class="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
          <div
            v-for="item in series.recommendations"
            :key="`${item.mediaType}-${item.id}`"
            class="w-[160px] shrink-0"
          >
            <MediaCard
              :id="item.id"
              :media-type="item.mediaType"
              :title="item.title"
              :poster-path="item.posterPath"
              :year="item.year"
              :tmdb-rating="item.tmdbRating"
              :genres="
                item.mediaType !== 'person'
                  ? getGenreNames(item.genreIds, item.mediaType)
                  : undefined
              "
            />
          </div>
        </div>
      </section>
      <p
        v-else-if="!authStore.isAuthenticated"
        class="rounded-full bg-surface-elevated px-4 py-3 text-center text-sm text-secondary"
      >
        {{ $t("mediaDetail.loginForRecommendations") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import CollapsableSection from "./CollapsableSection.vue";
import HorizontalScrollRow from "./HorizontalScrollRow.vue";

const props = defineProps<{ id: number }>();

const authStore = useAuthStore();
const { locale } = useI18n();

const { data: series, pending, error } = await useSeriesDetail(props.id);

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const posterUrl = computed(() =>
  series.value?.posterPath ? `${TMDB_IMAGE_BASE}${series.value.posterPath}` : null,
);
const backdropUrl = computed(() =>
  series.value?.backdropPath ? `${TMDB_BACKDROP_BASE}${series.value.backdropPath}` : null,
);
const hasTmdbRating = computed(
  () => series.value?.tmdbRating !== null && (series.value?.tmdbRating ?? 0) > 0,
);
const formattedVoteCount = computed(() => {
  const count = series.value?.voteCount;
  if (count === null || count === undefined) return "";
  return new Intl.NumberFormat(locale.value).format(count);
});

const {
  inWatchlist,
  pending: watchlistPending,
  toggle: toggleWatchlist,
} = useWatchlistAction(props.id, "series", series.value?.user?.inWatchlist ?? false);

const initialWatchedSeasons = new Set(
  (series.value?.seasons ?? []).filter((s) => s.watched).map((s) => s.seasonNumber),
);
const {
  isWatched: isSeasonWatched,
  isPending: isSeasonPending,
  toggle: toggleSeasonWatched,
} = useSeasonWatchedAction(props.id, initialWatchedSeasons);

const markingAllWatched = ref(false);
const allSeasonsWatched = computed(() =>
  series.value?.seasons.every((s) => isSeasonWatched(s.seasonNumber)) ?? false,
);

async function markAllSeasonsWatched() {
  if (!series.value) return;
  markingAllWatched.value = true;
  try {
    const unwatched = series.value.seasons.filter((s) => !isSeasonWatched(s.seasonNumber));
    await Promise.all(unwatched.map((s) => toggleSeasonWatched(s.seasonNumber)));
  } finally {
    markingAllWatched.value = false;
  }
}

const { getGenreNames } = useGenres();
</script>
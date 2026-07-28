<!-- apps/web/app/components/media-detail/MovieDetailContent.vue -->
<template>
  <div v-if="pending" class="flex min-h-[320px] items-center justify-center p-8">
    <p class="text-sm text-secondary">{{ $t("common.loading") }}</p>
  </div>

  <div v-else-if="error || !movie" class="flex min-h-[320px] items-center justify-center p-8">
    <p class="text-sm text-secondary">{{ $t("mediaDetail.loadError") }}</p>
  </div>

  <div v-else class="flex flex-col">
    <div class="relative h-40 w-full overflow-hidden rounded-t-2xl sm:h-[360px]">
      <img
        v-if="backdropUrl"
        :src="backdropUrl"
        :alt="movie.title"
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
            :alt="movie.title"
            class="h-full w-full object-contain"
          />
        </div>
        <div class="flex flex-1 flex-col gap-2 text-center sm:pb-2 sm:text-left">
          <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 class="text-xl font-bold text-primary sm:text-2xl">
              {{ movie.title }}
            </h2>
            <span
              v-if="movie.ageRating"
              class="rounded border border-border px-1.5 py-0.5 text-[11px] font-bold text-secondary"
            >
              {{ movie.ageRating }}
            </span>
          </div>
          <p class="text-sm text-secondary">
            <template v-if="movie.releaseYear">{{ movie.releaseYear }}<span class="px-1.5">·</span></template>
            <template v-if="movie.runtime">{{ formattedRuntime }}<span class="px-1.5">·</span></template>
            {{ movie.genres.map((g) => g.name).join(", ") }}
          </p>
          <p v-if="hasTmdbRating" class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span class="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
              TMDB
            </span>
            <span class="text-sm font-bold text-brand">
              ★ {{ movie.tmdbRating!.toFixed(1) }}
              <span class="font-normal text-secondary">· {{ formattedVoteCount }} {{ $t("mediaDetail.votes") }}</span>
            </span>
          </p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3 border-y border-border py-4 sm:flex-row sm:justify-between">
        <template v-if="authStore.isAuthenticated">
          <div class="flex flex-wrap items-center justify-center gap-2.5">
            <WatchlistButton
              :active="inWatchlist"
              :pending="watchlistPending"
              @toggle="toggleWatchlist"
            />
            <WatchedButton
              :active="watched"
              :pending="watchedPending"
              @toggle="toggleWatched"
            />
          </div>
        </template>
        <p v-else class="text-center text-[13px] text-secondary">
          {{ $t("mediaDetail.loginToTrack") }}
        </p>
      </div>

      <p class="text-sm leading-relaxed text-primary">
        {{ movie.overview || $t("mediaDetail.noOverview") }}
      </p>

      <CollapsableSection v-if="movie.trailer" :title="$t('mediaDetail.trailer')">
        <TrailerEmbed :youtube-key="movie.trailer.youtubeKey" />
      </CollapsableSection>

      <CollapsableSection v-if="movie.cast.length" :title="$t('mediaDetail.cast')">
        <HorizontalScrollRow>
          <PersonCard
            v-for="member in movie.cast"
            :key="member.id"
            :id="member.id"
            :name="member.name"
            :profile-path="member.profilePath"
            :role-label="member.character"
          />
        </HorizontalScrollRow>
      </CollapsableSection>

      <CollapsableSection v-if="movie.crew.length" :title="$t('mediaDetail.crew')">
        <HorizontalScrollRow>
          <PersonCard
            v-for="member in movie.crew"
            :key="`${member.id}-${member.job}`"
            :id="member.id"
            :name="member.name"
            :profile-path="member.profilePath"
            :role-label="member.job"
          />
        </HorizontalScrollRow>
      </CollapsableSection>

      <CollapsableSection :title="$t('mediaDetail.whereToWatch')">
        <ProvidersSection :providers="movie.providers" />
      </CollapsableSection>

      <section
        v-if="authStore.isAuthenticated && movie.recommendations.length"
        class="flex flex-col gap-3"
      >
        <h3 class="text-base font-bold text-primary">
          {{ $t("mediaDetail.recommendations") }}
        </h3>
        <div class="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
          <div
            v-for="item in movie.recommendations"
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

const { data: movie, pending, error } = await useMovieDetail(props.id);

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const posterUrl = computed(() =>
  movie.value?.posterPath ? `${TMDB_IMAGE_BASE}${movie.value.posterPath}` : null,
);
const backdropUrl = computed(() =>
  movie.value?.backdropPath ? `${TMDB_BACKDROP_BASE}${movie.value.backdropPath}` : null,
);
const hasTmdbRating = computed(
  () => movie.value?.tmdbRating !== null && (movie.value?.tmdbRating ?? 0) > 0,
);
const formattedVoteCount = computed(() => {
  const count = movie.value?.voteCount;
  if (count === null || count === undefined) return "";
  return new Intl.NumberFormat(locale.value).format(count);
});
const formattedRuntime = computed(() => {
  const minutes = movie.value?.runtime;
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
});

const {
  inWatchlist,
  pending: watchlistPending,
  toggle: toggleWatchlist,
} = useWatchlistAction(props.id, "movie", movie.value?.user?.inWatchlist ?? false);
const {
  watched,
  pending: watchedPending,
  toggle: toggleWatched,
} = useWatchedMovieAction(props.id, movie.value?.user?.watched ?? false);

const { getGenreNames } = useGenres();
</script>
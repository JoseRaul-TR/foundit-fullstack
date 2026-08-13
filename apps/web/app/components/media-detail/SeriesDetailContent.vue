<!-- apps/web/app/components/media-detail/SeriesDetailContent.vue -->
<!-- Same structure as the movie, with the season list and its bulk control.
     See MovieDetailContent for the reasoning behind the hero and the section
     order; the only difference here is that "Seasons" opens alongside "Where
     to watch", since it's the other thing a viewer came for. -->
<template>
  <div
    v-if="pending"
    class="flex min-h-[320px] items-center justify-center p-8"
  >
    <p class="text-sm text-secondary">{{ $t("common.loading") }}</p>
  </div>

  <div
    v-else-if="error || !series"
    class="flex min-h-[320px] items-center justify-center p-8"
  >
    <p class="text-sm text-secondary">{{ $t("mediaDetail.loadError") }}</p>
  </div>

  <div v-else class="flex flex-col">
    <div
      class="relative h-40 w-full overflow-hidden rounded-t-2xl sm:h-[360px]"
    >
      <img
        v-if="backdropUrl"
        :src="backdropUrl"
        :alt="series.title"
        class="h-full w-full object-cover"
      />
      <div
        class="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-page via-page/80 to-transparent"
      />
    </div>

    <div class="flex flex-col gap-6 px-5 pb-6 sm:px-8">
      <div
        class="mt-4 flex flex-col items-center gap-3 text-center sm:mt-6 sm:flex-row sm:items-start sm:gap-7 sm:text-left"
      >
        <div
          class="h-[210px] w-[140px] shrink-0 overflow-hidden rounded-xl bg-surface-elevated shadow-[0_8px_20px_rgba(0,0,0,0.5)] sm:h-[300px] sm:w-[200px] sm:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <img
            v-if="posterUrl"
            :src="posterUrl"
            :alt="series.title"
            class="h-full w-full object-cover"
          />
        </div>

        <div
          class="flex min-w-0 flex-1 flex-col items-center gap-2.5 sm:items-start"
        >
          <!-- A new season is the more specific piece of news, so it replaces
               the plain availability line rather than stacking with it. -->
          <p
            v-if="series.newSeasonsAvailable"
            class="text-[13px] font-semibold text-accent"
          >
            {{
              $t("mediaDetail.newSeasonAvailable", {
                services: listFormatter.format(series.availableOn),
              })
            }}
          </p>
          <p
            v-else-if="subscribedServices.length"
            class="text-[13px] font-semibold text-success"
          >
            <span class="sm:hidden">
              {{
                $t("mediaDetail.availableOn", { services: shortServicesLabel })
              }}
            </span>
            <span class="hidden sm:inline">
              {{
                $t("mediaDetail.availableOn", { services: allServicesLabel })
              }}
            </span>
          </p>

          <div
            class="flex flex-wrap items-center justify-center gap-3 sm:justify-start"
          >
            <h2 class="text-[22px] font-bold text-primary sm:text-[30px]">
              {{ series.title }}
            </h2>
            <StatusBadge :status="series.status" />
          </div>

          <p v-if="createdBy" class="text-sm text-secondary">
            {{ $t("mediaDetail.createdBy", { names: createdBy }) }}
          </p>

          <p class="text-[13px] text-secondary sm:text-sm">{{ metaLine }}</p>

          <div
            v-if="series.genres.length"
            class="flex flex-wrap justify-center gap-2 sm:justify-start"
          >
            <span
              v-for="genre in series.genres"
              :key="genre.id"
              class="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-secondary"
            >
              {{ genre.name }}
            </span>
          </div>

          <p v-if="hasTmdbRating" class="flex items-center gap-1.5">
            <span
              class="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] font-bold text-secondary"
            >
              TMDB
            </span>
            <span class="text-[13px] font-bold text-brand">
              ★ {{ tmdbRatingLabel }}
            </span>
            <span class="text-xs text-secondary">
              · {{ formattedVoteCount }} {{ $t("mediaDetail.votes") }}
            </span>
          </p>

          <!-- Inside the authenticated branch, unlike before: the stars used to
               sit outside both arms of the condition, so a visitor who cannot
               save a rating was still invited to give one. -->
          <template v-if="authStore.isAuthenticated">
            <RatingStars
              :model-value="rating"
              @update:model-value="setRating"
            />
            <div
              class="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start"
            >
              <WatchlistButton
                :active="inWatchlist"
                :pending="watchlistPending"
                @toggle="toggleWatchlist"
              />
              <WatchedButton
                :active="allSeasonsWatched"
                :pending="bulkPending"
                :active-label="$t('mediaDetail.allSeasonsWatched')"
                :inactive-label="$t('mediaDetail.markAllSeasonsWatched')"
                @toggle="toggleAllSeasons"
              />
            </div>
          </template>
          <p v-else class="text-[13px] text-secondary">
            {{ $t("mediaDetail.loginToTrackSeries") }}
          </p>
        </div>
      </div>

      <CollapsableSection
        :title="$t('mediaDetail.overview')"
        :collapsible="false"
      >
        <ExpandableText
          :text="series.overview || $t('mediaDetail.noOverview')"
        />
      </CollapsableSection>

      <CollapsableSection :title="$t('mediaDetail.whereToWatch')" default-open>
        <ProvidersSection :providers="series.providers" />
      </CollapsableSection>

      <CollapsableSection :title="$t('mediaDetail.seasons')" default-open>
        <SeasonList
          :seasons="series.seasons"
          :new-seasons-available="series.newSeasonsAvailable"
          :show-watched-button="authStore.isAuthenticated"
          :is-watched="isSeasonWatched"
          :is-pending="isSeasonPending"
          @toggle-watched="toggleSeasonWatched"
        />
      </CollapsableSection>

      <CollapsableSection
        v-if="series.trailer"
        :title="$t('mediaDetail.trailer')"
      >
        <TrailerEmbed
          :youtube-key="series.trailer.youtubeKey"
          :title="series.title"
        />
      </CollapsableSection>

      <CollapsableSection
        v-if="series.cast.length"
        :title="$t('mediaDetail.cast')"
      >
        <HorizontalScrollRow>
          <PersonCard
            v-for="member in series.cast"
            :key="`${member.id}-${member.character}`"
            :id="member.id"
            :name="member.name"
            :profile-path="member.profilePath"
            :role-label="member.character"
          />
        </HorizontalScrollRow>
      </CollapsableSection>

      <CollapsableSection
        v-if="series.crew.length"
        :title="$t('mediaDetail.crew')"
      >
        <HorizontalScrollRow>
          <PersonCard
            v-for="member in series.crew"
            :key="member.id"
            :id="member.id"
            :name="member.name"
            :profile-path="member.profilePath"
            :role-label="crewLabel(member.jobs)"
            :role-title="crewTitle(member.jobs)"
          />
        </HorizontalScrollRow>
      </CollapsableSection>

      <CollapsableSection
        v-if="authStore.isAuthenticated && series.recommendations.length"
        :title="$t('mediaDetail.recommendations')"
        default-open
      >
        <HorizontalScrollRow>
          <div
            v-for="item in series.recommendations"
            :key="`${item.mediaType}-${item.id}`"
            class="w-[calc((100%-1rem)/2)] shrink-0 sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
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
        </HorizontalScrollRow>
      </CollapsableSection>
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
const props = defineProps<{ id: number }>();

const authStore = useAuthStore();
const { t, locale } = useI18n();

const { data: series, pending, error } = await useSeriesDetail(props.id);

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const MOBILE_SERVICE_LIMIT = 2;

const posterUrl = computed(() =>
  series.value?.posterPath
    ? `${TMDB_IMAGE_BASE}${series.value.posterPath}`
    : null,
);
const backdropUrl = computed(() =>
  series.value?.backdropPath
    ? `${TMDB_BACKDROP_BASE}${series.value.backdropPath}`
    : null,
);

const listFormatter = computed(
  () =>
    new Intl.ListFormat(locale.value, { style: "long", type: "conjunction" }),
);

const createdBy = computed(() =>
  series.value?.createdBy.length
    ? listFormatter.value.format(series.value.createdBy)
    : "",
);

const metaLine = computed(() => {
  const parts: string[] = [];
  if (series.value?.releaseYear) parts.push(String(series.value.releaseYear));
  parts.push(t("common.mediaType.series"));
  if (series.value?.numberOfSeasons) {
    parts.push(
      t("mediaDetail.seasonsCount", { count: series.value.numberOfSeasons }),
    );
  }
  if (series.value?.ageRating) parts.push(series.value.ageRating);
  return parts.join("  ·  ");
});

const hasTmdbRating = computed(
  () =>
    series.value?.tmdbRating !== null && (series.value?.tmdbRating ?? 0) > 0,
);
const tmdbRatingLabel = computed(() =>
  (series.value?.tmdbRating ?? 0).toFixed(1),
);
const formattedVoteCount = computed(() => {
  const count = series.value?.voteCount;
  if (count === null || count === undefined) return "";
  return new Intl.NumberFormat(locale.value).format(count);
});

const subscribedServices = computed(() => {
  const names = new Set<string>();
  for (const byType of Object.values(series.value?.providers ?? {})) {
    for (const list of [byType.flatrate, byType.free, byType.ads]) {
      for (const provider of list) {
        if (provider.subscribed) names.add(provider.name);
      }
    }
  }
  return [...names];
});

const allServicesLabel = computed(() =>
  listFormatter.value.format(subscribedServices.value),
);
const shortServicesLabel = computed(() => {
  const list = subscribedServices.value;
  if (list.length <= MOBILE_SERVICE_LIMIT)
    return listFormatter.value.format(list);
  const shown = listFormatter.value.format(list.slice(0, MOBILE_SERVICE_LIMIT));
  return `${shown} ${t("mediaDetail.andMore", { count: list.length - MOBILE_SERVICE_LIMIT })}`;
});

const {
  inWatchlist,
  pending: watchlistPending,
  toggle: toggleWatchlist,
} = useWatchlistAction(
  props.id,
  "series",
  series.value?.user?.inWatchlist ?? false,
);

const initialWatchedSeasons = new Set(
  (series.value?.seasons ?? [])
    .filter((s) => s.watched)
    .map((s) => s.seasonNumber),
);
const {
  isWatched: isSeasonWatched,
  isPending: isSeasonPending,
  toggle: toggleSeasonWatched,
  markAllWatched,
  unmarkAllWatched,
} = useSeasonWatchedAction(props.id, initialWatchedSeasons);

// Season 0 is TMDB's specials bucket and `number_of_seasons` doesn't count it,
// so "all seasons" here means the real ones — the same rule the discover
// watched filter and the media-state endpoint already follow.
const regularSeasonNumbers = computed(() =>
  (series.value?.seasons ?? [])
    .map((s) => s.seasonNumber)
    .filter((n) => n !== 0),
);

const allSeasonsWatched = computed(
  () =>
    regularSeasonNumbers.value.length > 0 &&
    regularSeasonNumbers.value.every((n) => isSeasonWatched(n)),
);

const bulkPending = ref(false);

// It toggles now. It used to only ever mark, and then disable itself, so
// undoing meant unticking eleven seasons one at a time while every other
// control in the app went both ways.
async function toggleAllSeasons() {
  if (bulkPending.value) return;
  bulkPending.value = true;
  try {
    const seasons = regularSeasonNumbers.value;
    if (allSeasonsWatched.value) await unmarkAllWatched(seasons);
    else await markAllWatched(seasons);
  } finally {
    bulkPending.value = false;
  }
}

const { rating, setRating } = useRatingAction(
  props.id,
  "series",
  series.value?.user?.rating ?? null,
);

const { getGenreNames } = useGenres();

const { crewLabel, crewTitle } = useCrewLabel();
</script>

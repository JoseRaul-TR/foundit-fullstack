<!-- apps/web/app/components/media-detail/MovieDetailContent.vue -->
<!-- HeroRow from Figma 94:216 (desktop) and 97:213 (mobile), over the backdrop
     the wireframe doesn't draw: the drawing shows the row in isolation, and the
     image is the only large one on the page. The hero overlaps its lower
     gradient rather than sitting below it, so the two read as one block.

     Section order is deliberate. "Where to watch" is the question the app is
     named after and used to be fifth, under trailer, cast and crew — several
     screens down on a phone. It now opens directly under the actions, and the
     sections that are reference material stay collapsed. The default state is
     free information: it says which parts matter. -->
<template>
  <div
    v-if="pending"
    class="flex min-h-[320px] items-center justify-center p-8"
  >
    <p class="text-sm text-secondary">{{ $t("common.loading") }}</p>
  </div>

  <div
    v-else-if="error || !movie"
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
        :alt="movie.title"
        class="h-full w-full object-cover"
      />
      <!-- Deeper than the wireframe's 39%: the poster no longer overlaps the
           image, so the gradient is what ties the two together, and it needs
           room to arrive at the page colour without a visible seam. -->
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
            :alt="movie.title"
            class="h-full w-full object-cover"
          />
        </div>

        <div
          class="flex min-w-0 flex-1 flex-col items-center gap-2.5 sm:items-start"
        >
          <!-- Above the title on purpose: it's the answer the app exists to
               give, and putting it first means it's read before the name of
               the thing it's about. -->
          <p
            v-if="subscribedServices.length"
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

          <h2 class="text-[22px] font-bold text-primary sm:text-[30px]">
            {{ movie.title }}
          </h2>

          <p v-if="directedBy" class="text-sm text-secondary">
            {{ $t("mediaDetail.directedBy", { names: directedBy }) }}
          </p>

          <p class="text-[13px] text-secondary sm:text-sm">{{ metaLine }}</p>

          <div
            v-if="movie.genres.length"
            class="flex flex-wrap justify-center gap-2 sm:justify-start"
          >
            <span
              v-for="genre in movie.genres"
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
                :active="watched"
                :pending="watchedPending"
                @toggle="toggleWatched"
              />
            </div>
          </template>
          <p v-else class="text-[13px] text-secondary">
            {{ $t("mediaDetail.loginToTrack") }}
          </p>
        </div>
      </div>

      <CollapsableSection
        :title="$t('mediaDetail.overview')"
        :collapsible="false"
        ><ExpandableText
          :text="movie.overview || $t('mediaDetail.noOverview')"
        />
      </CollapsableSection>

      <CollapsableSection :title="$t('mediaDetail.whereToWatch')" default-open>
        <ProvidersSection :providers="movie.providers" />
      </CollapsableSection>

      <CollapsableSection
        v-if="movie.trailer"
        :title="$t('mediaDetail.trailer')"
      >
        <TrailerEmbed
          :youtube-key="movie.trailer.youtubeKey"
          :title="movie.title"
        />
      </CollapsableSection>

      <CollapsableSection
        v-if="movie.cast.length"
        :title="$t('mediaDetail.cast')"
      >
        <HorizontalScrollRow :has-more="castHasMore" @load-more="castLoadMore">
          <PersonCard
            v-for="member in castVisible"
            :key="`${member.id}-${member.character}`"
            :id="member.id"
            :name="member.name"
            :profile-path="member.profilePath"
            :role-label="member.character"
          />
        </HorizontalScrollRow>
      </CollapsableSection>

      <CollapsableSection
        v-if="movie.crew.length"
        :title="$t('mediaDetail.crew')"
      >
        <HorizontalScrollRow :has-more="crewHasMore" @load-more="crewLoadMore">
          <PersonCard
            v-for="member in crewVisible"
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
        v-if="authStore.isAuthenticated && movie.recommendations.length"
        :title="$t('mediaDetail.recommendations')"
        default-open
      >
        <HorizontalScrollRow
          :has-more="recommendationsHasMore"
          :loading="recommendationsLoading"
          @load-more="recommendationsLoadMore"
        >
          <div
            v-for="item in recommendations"
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

const { data: movie, pending, error } = await useMovieDetail(props.id);

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const MOBILE_SERVICE_LIMIT = 2;

const posterUrl = computed(() =>
  movie.value?.posterPath
    ? `${TMDB_IMAGE_BASE}${movie.value.posterPath}`
    : null,
);
const backdropUrl = computed(() =>
  movie.value?.backdropPath
    ? `${TMDB_BACKDROP_BASE}${movie.value.backdropPath}`
    : null,
);

const listFormatter = computed(
  () =>
    new Intl.ListFormat(locale.value, { style: "long", type: "conjunction" }),
);

const directedBy = computed(() =>
  movie.value?.directedBy.length
    ? listFormatter.value.format(movie.value.directedBy)
    : "",
);

const formattedRuntime = computed(() => {
  const minutes = movie.value?.runtime;
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
});

const metaLine = computed(() => {
  const parts: string[] = [];
  if (movie.value?.releaseYear) parts.push(String(movie.value.releaseYear));
  parts.push(t("common.mediaType.movie"));
  if (formattedRuntime.value) parts.push(formattedRuntime.value);
  if (movie.value?.ageRating) parts.push(movie.value.ageRating);
  return parts.join("  ·  ");
});

const hasTmdbRating = computed(
  () => movie.value?.tmdbRating !== null && (movie.value?.tmdbRating ?? 0) > 0,
);
const tmdbRatingLabel = computed(() =>
  (movie.value?.tmdbRating ?? 0).toFixed(1),
);
const formattedVoteCount = computed(() => {
  const count = movie.value?.voteCount;
  if (count === null || count === undefined) return "";
  return new Intl.NumberFormat(locale.value).format(count);
});

// Rent and buy never count as "available on your services", the same rule
// ProvidersSection enforces: those are per-item purchases, not something a
// subscription covers.
const subscribedServices = computed(() => {
  const names = new Set<string>();
  for (const byType of Object.values(movie.value?.providers ?? {})) {
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
  "movie",
  movie.value?.user?.inWatchlist ?? false,
);
const {
  watched,
  pending: watchedPending,
  toggle: toggleWatched,
} = useWatchedMovieAction(props.id, movie.value?.user?.watched ?? false);

const { rating, setRating } = useRatingAction(
  props.id,
  "movie",
  movie.value?.user?.rating ?? null,
);
const { getGenreNames } = useGenres();

const { crewLabel, crewTitle } = useCrewLabel();

const {
  visible: castVisible,
  hasMore: castHasMore,
  loadMore: castLoadMore,
} = useProgressiveList(() => movie.value?.cast ?? [], PEOPLE_BATCH);

const {
  visible: crewVisible,
  hasMore: crewHasMore,
  loadMore: crewLoadMore,
} = useProgressiveList(() => movie.value?.crew ?? [], PEOPLE_BATCH);

const {
  items: recommendations,
  hasMore: recommendationsHasMore,
  loading: recommendationsLoading,
  loadMore: recommendationsLoadMore,
} = useMediaRecommendations(
  "movie",
  props.id,
  () => movie.value?.recommendations ?? [],
  () => movie.value?.recommendationsHasMore ?? false,
);
</script>

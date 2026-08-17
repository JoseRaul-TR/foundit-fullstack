<!-- apps/web/app/components/media/MediaCard.vue -->
<!-- Figma 2:196, with one deliberate departure: the wireframe lays the title
     and meta over the poster behind a blur, and that was tried and rejected —
     the text was unreadable over bright posters. The metadata sits below the
     image instead, and only the three markers stay on top of it.

     Overlay positions are fixed by meaning, not by availability: the bookmark
     top right, the status marker top left, the platform bottom left. All of
     them are authenticated-only, since nothing they report exists for a
     visitor. -->
<template>
  <div class="group relative flex w-full flex-col gap-2 text-left">
    <div
      class="relative aspect-[255/383] w-full overflow-hidden rounded-[20px] bg-surface-elevated"
    >
      <img
        v-if="posterUrl"
        :src="posterUrl"
        :srcset="posterSrcset"
        :sizes="sizes ?? DEFAULT_SIZES"
        :alt="title"
        class="h-full w-full object-cover transition group-hover:brightness-110"
        :loading="eager || priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : undefined"
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

      <!-- Top left: one marker at most. A series that is finished cannot have
           a new season, and one that is up to date has nothing unwatched, so
           the two can never both apply — no priority rule is needed beyond
           the order of these branches. -->
      <NewSeasonBadge v-if="showNewSeason" class="absolute left-2 top-2" />
      <span
        v-else-if="showWatched"
        class="poster-marker absolute left-2 top-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 px-3 text-[11px] font-bold text-primary"
      >
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {{ $t("mediaDetail.watched") }}
      </span>

      <!-- Top right: the bookmark, and the only control on the poster. It sits
           on z-10 so the title's stretched pseudo-element passes underneath it
           rather than over it. -->
      <button
        v-if="showBookmark"
        type="button"
        class="poster-marker absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand/20 to-brand/5 text-brand transition hover:brightness-125 disabled:opacity-50"
        :aria-label="
          inWatchlist
            ? $t('mediaDetail.inWatchlist')
            : $t('mediaDetail.addToWatchlist')
        "
        :aria-pressed="inWatchlist"
        :disabled="toggleWatchlist.isPending.value"
        @click="onToggleWatchlist"
      >
        <svg
          class="h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          :fill="inWatchlist ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        >
          <path d="M6 2a2 2 0 0 0-2 2v18l8-5.333L20 22V4a2 2 0 0 0-2-2H6z" />
        </svg>
      </button>

      <!-- Bottom left: where you can already watch it, on your own services. -->
      <span
        v-if="showProvider"
        class="poster-marker absolute bottom-2 left-2 inline-flex h-8 max-w-[calc(100%-1rem)] items-center rounded-full bg-gradient-to-br from-success/20 to-success/5 px-3 text-[11px] font-bold text-success"
      >
        {{ provider }}
      </span>
    </div>

    <div class="flex flex-col gap-0.5 px-0.5">
      <!-- The card's control is the title, and the title's ::after covers the
           whole card. Before this the card was a div with role="button" that
           contained a real button, and a control inside a control is not
           reliably conveyed by screen readers.

           The title also makes a better control than the card did: its
           accessible name is the film's name rather than everything printed on
           the card, and the focus ring draws around one line of text instead
           of around a poster. The bookmark sits above the pseudo-element on
           z-10, which is what let both `.stop` modifiers go — nothing bubbles
           anywhere now, because the two controls are siblings. -->
      <button
        type="button"
        class="block w-full truncate text-left text-sm font-semibold text-primary after:absolute after:inset-0 after:rounded-[20px]"
        @click="mediaModal.open(id, mediaType)"
      >
        {{ title }}
      </button>
      <p class="truncate text-xs text-secondary">
        <span v-if="year">{{ year }} · </span>
        <span>{{ typeLabel }}</span>
        <template v-if="ratingLabel">
          <span> · </span>
          <span class="font-bold text-brand">{{ ratingLabel }}</span>
        </template>
      </p>
      <p v-if="genreLine" class="truncate text-xs text-secondary">
        {{ genreLine }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaType } from "@foundit/types";

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
  /**
   * Above the fold: load without waiting. The grid decides this, not the card
   * — which cards are in the first row depends on the column count, and the
   * column count lives in the grid's own classes.
   */
  eager?: boolean;
  /**
   * The LCP candidate. Implies `eager` and adds `fetchpriority="high"`, which
   * only means anything while it is scarce — exactly one card per page.
   */
  priority?: boolean;
  /** Drawn width, in `sizes` syntax. Defaults to the three page grids. */
  sizes?: string;
}>();

const { t } = useI18n();
const mediaModal = useMediaModal();
const authStore = useAuthStore();
const mediaState = useMediaState();
const toggleWatchlist = useToggleWatchlistMutation();

// w342 as the `src`: the width the card draws at DPR 1, and what a browser
// without srcset support gets. The srcset carries the rest.
const posterUrl = computed(() => tmdbImage(props.posterPath, 342));
const posterSrcset = computed(() =>
  tmdbImageSrcset(props.posterPath, [185, 342, 500]),
);

// Derived from layouts/default.vue and the grids the card renders in. Written
// as calc() rather than round vw values because at 412px/DPR 1.75 the card
// needs 319 device pixels and w342 is the next size up — a 23px margin that
// any approximation spends, landing back on w500.
const DEFAULT_SIZES =
  "(min-width: 1280px) 286px," +
  " (min-width: 1024px) calc((100vw - 136px) / 4)," +
  " (min-width: 640px) calc((100vw - 80px) / 3)," +
  " calc((100vw - 48px) / 2)";

// People are not tracked: there is no list to add them to and nothing to mark
// as seen.
const trackable = computed(() => props.mediaType !== "person");
const personalised = computed(
  () => authStore.isAuthenticated && trackable.value,
);

const inWatchlist = computed(
  () =>
    personalised.value && mediaState.isInWatchlist(props.id, props.mediaType),
);
const showBookmark = computed(() => personalised.value);
const showNewSeason = computed(() => personalised.value && !!props.newSeason);
const showWatched = computed(
  () => personalised.value && mediaState.isWatched(props.id, props.mediaType),
);
const showProvider = computed(
  () => personalised.value && !!props.subscribed && !!props.provider,
);

function onToggleWatchlist() {
  if (toggleWatchlist.isPending.value) return;
  toggleWatchlist.mutate({
    tmdbId: props.id,
    mediaType: props.mediaType as MediaType,
    add: !inWatchlist.value,
  });
}

const typeLabel = computed(() => t(`common.mediaType.${props.mediaType}`));

const hasRating = computed(
  () => props.tmdbRating !== null && props.tmdbRating > 0,
);
const ratingLabel = computed(() =>
  hasRating.value && props.tmdbRating !== null
    ? `★ ${props.tmdbRating.toFixed(1)}`
    : "",
);

const genreLine = computed(() => props.genres?.slice(0, 3).join(" · ") ?? "");
</script>

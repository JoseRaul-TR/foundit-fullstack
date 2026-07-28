<!-- apps/web/app/components/media-detail/PersonDetailContent.vue -->
<template>
  <div v-if="pending" class="flex min-h-[320px] items-center justify-center p-8">
    <p class="text-sm text-secondary">{{ $t("common.loading") }}</p>
  </div>

  <div v-else-if="error || !person" class="flex min-h-[320px] items-center justify-center p-8">
    <p class="text-sm text-secondary">{{ $t("mediaDetail.loadError") }}</p>
  </div>

  <div v-else class="flex flex-col gap-6 px-5 py-6 sm:px-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:gap-6">
      <img
        v-if="profileUrl"
        :src="profileUrl"
        :alt="person.name"
        class="h-[210px] w-[140px] shrink-0 self-center rounded-xl object-cover shadow-lg sm:h-[300px] sm:w-[200px] sm:self-start"
      />
      <div
        v-else
        class="grid h-[210px] w-[140px] shrink-0 place-items-center self-center rounded-xl bg-surface-elevated shadow-lg sm:h-[300px] sm:w-[200px] sm:self-start"
      >
        <svg
          class="h-16 w-16 text-border"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
        </svg>
      </div>

      <div class="flex flex-1 flex-col gap-2 text-center sm:text-left">
        <h2 class="text-xl font-bold text-primary sm:text-2xl">
          {{ person.name }}
        </h2>
        <span
          v-if="departmentLabel"
          class="mx-auto w-fit rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-primary sm:mx-0"
        >
          {{ $t("mediaDetail.knownFor", { department: departmentLabel }) }}
        </span>
        <p v-if="person.birthday" class="text-sm text-secondary">
          {{
            person.placeOfBirth
              ? $t("mediaDetail.bornInPlace", {
                  date: formatDate(person.birthday),
                  place: person.placeOfBirth,
                })
              : $t("mediaDetail.bornOn", { date: formatDate(person.birthday) })
          }}
        </p>
      </div>
    </div>

    <section class="flex flex-col gap-2">
      <h3 class="text-base font-bold text-primary">
        {{ $t("mediaDetail.biography") }}
      </h3>
      <p v-if="!person.biography" class="text-sm text-secondary">
        {{ $t("mediaDetail.noBiography") }}
      </p>
      <template v-else>
        <p class="text-sm leading-relaxed text-primary">{{ displayedBio }}</p>
        <button
          v-if="isBioLong"
          type="button"
          class="w-fit text-[13px] font-bold text-secondary transition hover:text-primary"
          @click="bioExpanded = !bioExpanded"
        >
          {{ bioExpanded ? $t("mediaDetail.readLess") : $t("mediaDetail.readMore") }}
        </button>
      </template>
    </section>

    <CollapsableSection v-if="person.photos.length" :title="$t('mediaDetail.photos')">
      <div class="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
        <img
          v-for="(photo, index) in person.photos"
          :key="index"
          :src="`${TMDB_PROFILE_BASE}${photo.filePath}`"
          :alt="person.name"
          class="h-[213px] w-[160px] shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      </div>
    </CollapsableSection>

    <CollapsableSection v-if="credits.primary.length" :title="$t('mediaDetail.filmographyAs', { role: departmentLabel })">
      <div class="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
        <div
          v-for="item in credits.primary"
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
          />
          <p class="mt-1 truncate px-0.5 text-xs text-secondary">
            {{ item.roleLabels.join(", ") }}
          </p>
        </div>
      </div>
    </CollapsableSection>

    <CollapsableSection v-if="credits.other.length" :title="$t('mediaDetail.filmographyOther')">
      <div class="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
        <div
          v-for="item in credits.other"
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
          />
          <p class="mt-1 truncate px-0.5 text-xs text-secondary">
            {{ item.roleLabels.join(", ") }}
          </p>
        </div>
      </div>
    </CollapsableSection>
  </div>
</template>

<script setup lang="ts">
import type { PersonDetailResponse } from "@foundit/types";
import CollapsableSection from "./CollapsableSection.vue";

interface PersonCreditItem {
  id: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath: string | null;
  year: number | null;
  tmdbRating: number | null;
  popularity: number | null;
  roleLabels: string[];
}

interface RawCredit {
  id: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath: string | null;
  year: number | null;
  tmdbRating: number | null;
  popularity: number | null;
  roleLabel: string;
  department?: string;
}

function dedupeByTitle(items: RawCredit[]): PersonCreditItem[] {
  const map = new Map<string, PersonCreditItem>();
  for (const item of items) {
    const key = `${item.mediaType}-${item.id}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.roleLabels.includes(item.roleLabel)) {
        existing.roleLabels.push(item.roleLabel);
      }
    } else {
      map.set(key, { ...item, roleLabels: [item.roleLabel] });
    }
  }
  return [...map.values()];
}

function buildCredits(person: PersonDetailResponse) {
  const department = person.knownForDepartment;
  const isActingPrimary = department === "Acting";

  const movieCast: RawCredit[] = person.movieCredits.cast.map((c) => ({
    id: c.id,
    mediaType: "movie",
    title: c.title,
    posterPath: c.posterPath,
    year: c.year,
    tmdbRating: c.tmdbRating,
    popularity: c.popularity,
    roleLabel: c.character,
  }));
  const seriesCast: RawCredit[] = person.seriesCredits.cast.map((c) => ({
    id: c.id,
    mediaType: "series",
    title: c.name,
    posterPath: c.posterPath,
    year: c.firstAirYear,
    tmdbRating: c.tmdbRating,
    popularity: c.popularity,
    roleLabel: c.character,
  }));
  const movieCrew: RawCredit[] = person.movieCredits.crew.map((c) => ({
    id: c.id,
    mediaType: "movie",
    title: c.title,
    posterPath: c.posterPath,
    year: c.year,
    tmdbRating: c.tmdbRating,
    popularity: c.popularity,
    roleLabel: c.job,
    department: c.department,
  }));
  const seriesCrew: RawCredit[] = person.seriesCredits.crew.map((c) => ({
    id: c.id,
    mediaType: "series",
    title: c.name,
    posterPath: c.posterPath,
    year: c.firstAirYear,
    tmdbRating: c.tmdbRating,
    popularity: c.popularity,
    roleLabel: c.job,
    department: c.department,
  }));

  const allCast = [...movieCast, ...seriesCast];
  const allCrew = [...movieCrew, ...seriesCrew];

  const primaryRaw = isActingPrimary
    ? allCast
    : allCrew.filter((c) => c.department === department);
  const otherRaw = isActingPrimary
    ? allCrew
    : [...allCast, ...allCrew.filter((c) => c.department !== department)];

  const byRelevanceDescending = (a: PersonCreditItem, b: PersonCreditItem) => {
    const aValue = a.popularity ?? a.tmdbRating ?? 0;
    const bValue = b.popularity ?? b.tmdbRating ?? 0;
    return bValue - aValue;
  };

  return {
    primary: dedupeByTitle(primaryRaw).sort(byRelevanceDescending),
    other: dedupeByTitle(otherRaw).sort(byRelevanceDescending),
  };
}

const props = defineProps<{ id: number }>();

const { t, te } = useI18n();
const { data: person, pending, error } = await usePersonDetail(props.id);

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

const profileUrl = computed(() =>
  person.value?.profilePath ? `${TMDB_IMAGE_BASE}${person.value.profilePath}` : null,
);

const departmentLabel = computed(() => {
  const dep = person.value?.knownForDepartment;
  if (!dep) return "";
  const key = `mediaDetail.departmentRoles.${dep}`;
  return te(key) ? t(key) : dep;
});

const BIO_TRUNCATE_LENGTH = 300;
const bioExpanded = ref(false);
const isBioLong = computed(() => (person.value?.biography?.length ?? 0) > BIO_TRUNCATE_LENGTH);
const displayedBio = computed(() => {
  const bio = person.value?.biography;
  if (!bio) return "";
  if (!isBioLong.value || bioExpanded.value) return bio;
  return `${bio.slice(0, BIO_TRUNCATE_LENGTH).trimEnd()}…`;
});

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const credits = computed(() =>
  person.value ? buildCredits(person.value) : { primary: [], other: [] },
);
</script>
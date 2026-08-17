<!-- apps/web/app/components/media-detail/PersonDetailContent.vue -->
<template>
  <div
    v-if="pending"
    class="flex min-h-[320px] items-center justify-center p-8"
  >
    <p class="text-sm text-secondary">{{ $t("common.loading") }}</p>
  </div>

  <div
    v-else-if="error || !person"
    class="flex min-h-[320px] items-center justify-center p-8"
  >
    <p class="text-sm text-secondary">{{ $t("mediaDetail.loadError") }}</p>
  </div>

  <!-- pt-[52px] cancels the pull the modal applies so its header can float
       over the backdrop. There's no backdrop here, so the space has to come
       back — otherwise the name sits under the back and close buttons — and
       then the hero keeps the same 16/24px gap the other two have below their
       image. -->
  <div v-else class="flex flex-col gap-6 px-5 pb-6 pt-[52px] sm:px-8">
    <div class="mt-4 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:gap-6">
      <img
        v-if="profileUrl"
        :src="profileUrl"
        :alt="person.name"
        class="h-[210px] w-[140px] shrink-0 self-center rounded-xl object-cover shadow-[0_8px_20px_rgba(0,0,0,0.5)] sm:h-[300px] sm:w-[200px] sm:self-start sm:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
      />
      <div
        v-else
        class="grid h-[210px] w-[140px] shrink-0 place-items-center self-center rounded-xl bg-surface-elevated shadow-[0_8px_20px_rgba(0,0,0,0.5)] sm:h-[300px] sm:w-[200px] sm:self-start sm:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
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

    <CollapsableSection
      :title="$t('mediaDetail.biography')"
      :collapsible="false"
    >
      <p v-if="!person.biography" class="text-sm text-secondary">
        {{ $t("mediaDetail.noBiography") }}
      </p>
      <ExpandableText v-else :text="person.biography" :limit="300" />
    </CollapsableSection>

    <CollapsableSection
      v-if="credits.primary.length"
      :title="$t('mediaDetail.filmographyAs', { role: departmentLabel })"
      default-open
    >
      <HorizontalScrollRow>
        <div
          v-for="item in credits.primary"
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
          />
          <p class="mt-1 truncate px-0.5 text-xs text-secondary">
            {{ item.roleLabels.join(", ") }}
          </p>
        </div>
      </HorizontalScrollRow>
    </CollapsableSection>

    <CollapsableSection
      v-if="credits.other.length"
      :title="$t('mediaDetail.filmographyOther')"
    >
      <HorizontalScrollRow>
        <div
          v-for="item in credits.other"
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
          />
          <p class="mt-1 truncate px-0.5 text-xs text-secondary">
            {{ item.roleLabels.join(", ") }}
          </p>
        </div>
      </HorizontalScrollRow>
    </CollapsableSection>

    <CollapsableSection
      v-if="person.photos.length"
      :title="$t('mediaDetail.photos')"
    >
      <div class="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
        <img
          v-for="(photo, index) in person.photos"
          :key="index"
          :src="tmdbImage(photo.filePath, 185) ?? undefined"
          :alt="person.name"
          class="h-[213px] w-[160px] shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      </div>
    </CollapsableSection>
  </div>
</template>

<script setup lang="ts">
import type { PersonDetailResponse } from "@foundit/types";

interface PersonCreditItem {
  id: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath: string | null;
  year: number | null;
  tmdbRating: number | null;
  roleLabels: string[];
}

interface RawCredit {
  id: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath: string | null;
  year: number | null;
  tmdbRating: number | null;
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
    roleLabel: c.character,
  }));
  const seriesCast: RawCredit[] = person.seriesCredits.cast.map((c) => ({
    id: c.id,
    mediaType: "series",
    title: c.name,
    posterPath: c.posterPath,
    year: c.firstAirYear,
    tmdbRating: c.tmdbRating,
    roleLabel: c.character,
  }));
  const movieCrew: RawCredit[] = person.movieCredits.crew.map((c) => ({
    id: c.id,
    mediaType: "movie",
    title: c.title,
    posterPath: c.posterPath,
    year: c.year,
    tmdbRating: c.tmdbRating,
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

  // Chronological, newest first. The previous rule sorted by
  // `popularity ?? tmdbRating`, and the mixing of two incomparable scales was
  // the smaller of its two problems. The larger one: TMDB's popularity on a
  // credit belongs to the programme, not to this person's part in it, so one
  // evening as a guest on a nightly talk show outranked a leading role in a
  // film — the talk show is watched every day and the film once.
  //
  // TMDB gives us a year and not a date, so ties are broken by rating: within
  // one year, the better-regarded credit first. Credits with no year go last
  // and say so here, instead of landing there by accident the way `?? 0` used
  // to put them.
  const byYearDescending = (a: PersonCreditItem, b: PersonCreditItem) => {
    if (a.year === null && b.year === null) return 0;
    if (a.year === null) return 1;
    if (b.year === null) return -1;
    if (a.year !== b.year) return b.year - a.year;
    return (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0);
  };

  return {
    primary: dedupeByTitle(primaryRaw).sort(byYearDescending),
    other: dedupeByTitle(otherRaw).sort(byYearDescending),
  };
}

const props = defineProps<{ id: number }>();

const { t, te, locale } = useI18n();
const { data: person, pending, error } = await usePersonDetail(props.id);

const profileUrl = computed(() => tmdbImage(person.value?.profilePath, 500));

const departmentLabel = computed(() => {
  const dep = person.value?.knownForDepartment;
  if (!dep) return "";
  const key = `mediaDetail.departmentRoles.${dep}`;
  return te(key) ? t(key) : dep;
});

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(locale.value, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const credits = computed(() =>
  person.value ? buildCredits(person.value) : { primary: [], other: [] },
);
</script>

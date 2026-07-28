<!-- apps/web/app/components/discover/DiscoverFilters.vue -->
<template>
  <div
    class="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-bold text-primary">{{ $t("discover.title") }}</h3>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="text-xs font-medium text-secondary hover:text-primary"
        @click="clearAll"
      >
        {{ $t("discover.filters.clear") }}
      </button>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-semibold text-secondary">{{
        $t("discover.filters.genre")
      }}</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="genre in movieGenres"
          :key="genre.id"
          type="button"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition"
          :class="
            localFilters.genres.includes(genre.id)
              ? 'bg-brand text-page'
              : 'border border-border text-secondary hover:text-primary'
          "
          @click="toggleGenre(genre.id)"
        >
          {{ genre.name }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1 text-xs font-semibold text-secondary">
        {{ $t("discover.filters.year") }} (min)
        <input
          v-model.number="localFilters.yearFrom"
          type="number"
          class="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-sm text-primary"
          placeholder="1900"
        />
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold text-secondary">
        {{ $t("discover.filters.year") }} (max)
        <input
          v-model.number="localFilters.yearTo"
          type="number"
          class="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-sm text-primary"
          :placeholder="String(currentYear)"
        />
      </label>
    </div>

    <label class="flex flex-col gap-1.5 text-xs font-semibold text-secondary">
      {{ $t("discover.filters.minRating")
      }}{{
        localFilters.minRating ? `: ${localFilters.minRating.toFixed(1)}` : ""
      }}
      <input
        v-model.number="localFilters.minRating"
        type="range"
        min="0"
        max="10"
        step="0.5"
        class="accent-brand"
      />
    </label>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-semibold text-secondary">{{
        $t("discover.filters.platform")
      }}</span>
      <div v-if="subscribedNames.length" class="flex flex-wrap gap-2">
        <span
          v-for="name in subscribedNames"
          :key="name"
          class="rounded-full bg-surface-elevated px-3 py-1 text-xs text-primary"
        >
          {{ name }}
        </span>
      </div>
      <NuxtLink
        v-else
        to="/profile"
        class="text-xs text-accent hover:underline"
      >
        {{ $t("profile.streamingServices.selectCountryFirst") }}
      </NuxtLink>
    </div>

    <div v-if="profileStore.ageRatingCountry" class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1 text-xs font-semibold text-secondary">
        {{ $t("discover.filters.ageRating") }} ({{
          $t("common.mediaType.movie")
        }})
        <select
          v-model="localFilters.movieAgeRatingMax"
          class="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-sm text-primary"
        >
          <option :value="null">—</option>
          <option
            v-for="cert in movieCertifications"
            :key="cert.certification"
            :value="cert.certification"
          >
            {{ cert.certification }}
          </option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold text-secondary">
        {{ $t("discover.filters.ageRating") }} ({{
          $t("common.mediaType.series")
        }})
        <select
          v-model="localFilters.seriesAgeRatingMax"
          class="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-sm text-primary"
        >
          <option :value="null">—</option>
          <option
            v-for="cert in seriesCertifications"
            :key="cert.certification"
            :value="cert.certification"
          >
            {{ cert.certification }}
          </option>
        </select>
      </label>
    </div>
    <p v-else class="text-xs text-secondary">
      <NuxtLink to="/profile" class="text-accent hover:underline">{{
        $t("profile.ageRating.title")
      }}</NuxtLink>
    </p>

    <label class="flex flex-col gap-1.5 text-xs font-semibold text-secondary">
      {{ $t("discover.filters.sortBy") }}
      <select
        v-model="localFilters.sort"
        class="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-sm text-primary"
      >
        <option value="popularity">
          {{ $t("search.sortBy.label") }}: Popularity
        </option>
        <option value="rating">Rating</option>
        <option value="release_date">{{ $t("watchlist.sortBy.year") }}</option>
        <option value="title">{{ $t("watchlist.sortBy.title") }}</option>
      </select>
    </label>

    <button
      type="button"
      class="rounded-full bg-brand px-4 py-2 text-sm font-bold text-page transition hover:brightness-110"
      @click="apply"
    >
      {{ $t("discover.filters.apply") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useDiscoverStore } from "~/stores/discover";

const store = useDiscoverStore();
const profileStore = useProfileStore();
const discover = useDiscover();
const { movieGenres } = useGenres();

const currentYear = new Date().getFullYear();
const localFilters = reactive({ ...store.filters });

watch(
  () => store.filters,
  (filters) => Object.assign(localFilters, filters),
  { deep: true },
);

const ageRatingCountryRef = computed(() => profileStore.ageRatingCountry);
const { certifications: movieCertifications } = useCertifications(
  "movie",
  ageRatingCountryRef,
);
const { certifications: seriesCertifications } = useCertifications(
  "series",
  ageRatingCountryRef,
);

const subscribedNames = computed(() => {
  const names = new Set<string>();
  for (const services of Object.values(profileStore.subscribedServices)) {
    for (const s of services) names.add(s.name);
  }
  return [...names];
});

const hasActiveFilters = computed(() => discover.hasActiveFilters.value);

function toggleGenre(id: number) {
  const idx = localFilters.genres.indexOf(id);
  if (idx === -1) localFilters.genres.push(id);
  else localFilters.genres.splice(idx, 1);
}

function apply() {
  store.filters = { ...localFilters };
  discover.applyFilters();
}

function clearAll() {
  store.resetFilters();
  Object.assign(localFilters, store.filters);
  discover.applyFilters();
}
</script>

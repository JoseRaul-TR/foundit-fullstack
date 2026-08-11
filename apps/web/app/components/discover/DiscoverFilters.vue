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
    <div v-if="availableCountries.length" class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-secondary">{{
          $t("discover.filters.country")
        }}</span>
        <button
          type="button"
          class="text-xs font-medium text-accent hover:underline"
          @click="toggleAllCountries"
        >
          {{
            allCountriesSelected
              ? $t("discover.filters.deselectAll")
              : $t("discover.filters.selectAll")
          }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="country in availableCountries"
          :key="country.code"
          type="button"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition"
          :class="
            isCountrySelected(country.code)
              ? 'bg-brand text-page'
              : 'border border-border text-secondary hover:text-primary'
          "
          @click="toggleCountry(country.code)"
        >
          {{ countryName(country.code, country.name) }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-secondary">{{
          $t("discover.filters.platform")
        }}</span>
        <button
          v-if="allSubscribedProviders.length"
          type="button"
          class="text-xs font-medium text-accent hover:underline"
          @click="toggleAllProviders"
        >
          {{
            allProvidersSelected
              ? $t("discover.filters.deselectAll")
              : $t("discover.filters.selectAll")
          }}
        </button>
      </div>

      <div v-if="allSubscribedProviders.length" class="flex flex-wrap gap-2">
        <button
          v-for="provider in allSubscribedProviders"
          :key="provider.providerId"
          type="button"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition"
          :class="
            isProviderSelected(provider.providerId)
              ? 'bg-brand text-page'
              : 'border border-border text-secondary hover:text-primary'
          "
          @click="toggleProvider(provider.providerId)"
        >
          {{ provider.name }}
        </button>
      </div>
      <p v-else-if="availableCountries.length" class="text-xs text-secondary">
        {{ $t("discover.filters.selectCountryForPlatforms") }}
      </p>
      <NuxtLink
        v-else
        :to="localePath('/profile')"
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
      <NuxtLink
        :to="localePath('/profile')"
        class="text-accent hover:underline"
        >{{ $t("profile.ageRating.title") }}</NuxtLink
      >
    </p>

    <label class="flex flex-col gap-1.5 text-xs font-semibold text-secondary">
      {{ $t("discover.filters.sortBy") }}
      <select
        v-model="localFilters.sort"
        class="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-sm text-primary"
      >
        <option value="popularity">
          {{ $t("discover.filters.sort.popularity") }}
        </option>
        <option value="rating">{{ $t("discover.filters.sort.rating") }}</option>
        <option value="release_date">
          {{ $t("discover.filters.sort.releaseDate") }}
        </option>
        <option value="title">{{ $t("discover.filters.sort.title") }}</option>
      </select>
    </label>

    <label class="flex items-center gap-2 text-xs font-semibold text-secondary">
      <input
        v-model="localFilters.excludeWatched"
        type="checkbox"
        class="accent-brand"
      />
      {{ $t("discover.filters.excludeWatched") }}
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
const store = useDiscoverStore();
const profileStore = useProfileStore();
const discover = useDiscover();
const { movieGenres } = useGenres();
const localePath = useLocalePath();

const currentYear = new Date().getFullYear();

function snapshotFilters(): DiscoverFiltersState {
  return structuredClone(toRaw(store.filters));
}

const localFilters = reactive(snapshotFilters());

watch(
  () => store.filters,
  () => Object.assign(localFilters, snapshotFilters()),
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

const { countryName, sortByCountryName } = useCountryName();

const availableCountries = computed(() => {
  const withServices = new Set(Object.keys(profileStore.subscribedServices));
  return sortByCountryName(
    profileStore.countries.filter((c) => withServices.has(c.code)),
    (c) => c.code,
  );
});

const effectiveSelectedCountryCodes = computed(
  () =>
    localFilters.selectedCountryCodes ??
    availableCountries.value.map((c) => c.code),
);

function isCountrySelected(code: string): boolean {
  return effectiveSelectedCountryCodes.value.includes(code);
}

function toggleCountry(code: string) {
  const next = new Set(effectiveSelectedCountryCodes.value);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  localFilters.selectedCountryCodes = [...next];
}

const allCountriesSelected = computed(() =>
  availableCountries.value.every((c) => isCountrySelected(c.code)),
);

function toggleAllCountries() {
  localFilters.selectedCountryCodes = allCountriesSelected.value ? [] : null;
}

// Providers refine the chosen countries, so the list only offers what those
// countries actually carry. Deselecting a country removes its exclusive
// platforms from the panel rather than leaving controls that do nothing.
const allSubscribedProviders = computed(() => {
  const byId = new Map<number, string>();
  for (const [countryCode, services] of Object.entries(
    profileStore.subscribedServices,
  )) {
    if (!effectiveSelectedCountryCodes.value.includes(countryCode)) continue;
    for (const s of services) {
      if (!byId.has(s.providerId)) byId.set(s.providerId, s.name);
    }
  }
  return [...byId.entries()].map(([providerId, name]) => ({
    providerId,
    name,
  }));
});

// null (not yet touched) behaves as "everything checked" -- the default,
// unchanged behavior. Once the user toggles anything, localFilters holds
// a concrete array from then on.
const effectiveSelectedIds = computed(
  () =>
    localFilters.selectedProviderIds ??
    allSubscribedProviders.value.map((p) => p.providerId),
);

function isProviderSelected(providerId: number): boolean {
  return effectiveSelectedIds.value.includes(providerId);
}

function toggleProvider(providerId: number) {
  const next = new Set(effectiveSelectedIds.value);
  if (next.has(providerId)) next.delete(providerId);
  else next.add(providerId);
  localFilters.selectedProviderIds = [...next];
}

const allProvidersSelected = computed(() =>
  allSubscribedProviders.value.every((p) => isProviderSelected(p.providerId)),
);

function toggleAllProviders() {
  localFilters.selectedProviderIds = allProvidersSelected.value ? [] : null;
}

const hasActiveFilters = computed(() => discover.hasActiveFilters.value);

function toggleGenre(id: number) {
  const idx = localFilters.genres.indexOf(id);
  localFilters.genres =
    idx === -1
      ? [...localFilters.genres, id]
      : localFilters.genres.filter((g) => g !== id);
}

function apply() {
  store.setFilters(localFilters);
  discover.applyFilters();
}

function clearAll() {
  store.resetFilters();
  Object.assign(localFilters, snapshotFilters());
  discover.applyFilters();
}
</script>

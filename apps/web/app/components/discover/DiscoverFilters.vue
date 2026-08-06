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
import { useDiscoverStore, type DiscoverFiltersState } from "~/stores/discover";

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

// Flat, deduplicated by providerId across every configured country --
// a compact sidebar panel isn't the place for per-country grouping
// (that stays in /profile's ServiceSelector).
const allSubscribedProviders = computed(() => {
  const byId = new Map<number, string>();
  for (const services of Object.values(profileStore.subscribedServices)) {
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

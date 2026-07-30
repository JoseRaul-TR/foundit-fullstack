<!--
Note: Rent/buy are NEVER highlighted as "subscribed" even if the backend
might mark them -- Figma is explicit: "pay-per-item, not account-based".
This is enforced here on the frontend instead of affecting the backend.

Note 2: The title's <h3> element resides within the parent element, which wraps this
component in <CollapsableSection :title="$t('mediaDetail.whereToWatch')">.

Note 3: All pills from the same country share the same `href` (`grouped.link`) — TMDB only exposes one link per country/title, not per
provider (see ticket). Clicking it takes you to the TMDB /watch page, from where
JustWatch resolves the final destination to the specific platform.
-->
<template>
  <div v-if="hasAnyCountry" class="flex flex-col gap-3">
    <div class="flex justify-end">
      <select
        v-if="countryCodes.length > 1"
        v-model="selectedCountry"
        class="rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-primary"
      >
        <option v-for="code in countryCodes" :key="code" :value="code">
          {{ countryName(code) }}
        </option>
      </select>
      <span v-else class="text-xs font-medium text-secondary">
        {{ countryName(selectedCountry) }}
      </span>
    </div>

    <template v-for="type in providerTypes" :key="type">
      <div v-if="grouped?.[type]?.length" class="flex flex-col gap-2">
        <span
          class="text-[11px] font-semibold uppercase tracking-[0.66px] text-secondary"
        >
          {{ $t(`mediaDetail.providerTypes.${type}`) }}
        </span>
        <div class="flex flex-wrap gap-2">
          <ProviderBadge
            v-for="provider in grouped[type]"
            :key="provider.providerId"
            :name="provider.name"
            :logo-path="provider.logoPath"
            :href="grouped?.link"
            :subscribed="
              (type === 'flatrate' || type === 'free') && provider.subscribed
            "
          />
        </div>
      </div>
    </template>

    <p v-if="!authStore.isAuthenticated" class="text-[11px] text-secondary">
      {{ $t("mediaDetail.loginToSeeAvailability") }}
    </p>

    <p
      class="flex flex-wrap items-center gap-1.5 text-[10px] text-secondary/70"
    >
      {{ $t("mediaDetail.justWatchAttribution") }}
      <a
        href="https://www.justwatch.com/"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium underline"
      >
        JustWatch
      </a>
      <span aria-hidden="true">·</span>
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0"
      >
        <img src="/tmdb-logo.svg" alt="TMDB" class="h-3 w-auto opacity-70" />
      </a>
    </p>
  </div>
  <p v-else class="text-sm text-secondary">
    {{ $t("mediaDetail.noProviders") }}
  </p>
</template>

<script setup lang="ts">
import type { ProvidersByType } from "@foundit/types";

const props = defineProps<{
  providers: Record<string, ProvidersByType>;
}>();

const authStore = useAuthStore();
const { locale } = useI18n();
const providerTypes = ["flatrate", "free", "rent", "buy"] as const;

const regionNames = computed(
  () => new Intl.DisplayNames([locale.value], { type: "region" }),
);
function countryName(code: string): string {
  return regionNames.value.of(code) ?? code;
}

const countryCodes = computed(() => {
  const codes = Object.keys(props.providers);
  return [...codes].sort((a, b) =>
    countryName(a).localeCompare(countryName(b), locale.value),
  );
});
const hasAnyCountry = computed(() => countryCodes.value.length > 0);

const selectedCountry = ref(countryCodes.value[0] ?? "");
watch(countryCodes, (codes) => {
  if (!codes.includes(selectedCountry.value)) {
    selectedCountry.value = codes[0] ?? "";
  }
});

const grouped = computed(() => props.providers[selectedCountry.value]);
</script>

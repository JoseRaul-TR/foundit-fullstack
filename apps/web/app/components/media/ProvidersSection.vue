<!-- apps/web/app/components/media/ProvidersSection.vue -->
<!--
  Nota: rent/buy NUNCA se resaltan como "subscribed" aunque el backend
  pudiera marcarlos -- Figma es explícito: "pay-per-item, no account-based".
  Se fuerza aquí en el frontend en vez de tocar el backend.

  Nota 2: el <h3> del título vive en el padre, que envuelve este
  componente en <CollapsableSection :title="$t('mediaDetail.whereToWatch')">.
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

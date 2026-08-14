<!-- apps/web/app/components/profile/CountryServicesSection.vue -->
<!-- Countries and their services, in one section rather than two. They were
     split, with a second row of country pills below acting as tabs, so the
     same country appeared twice on the page meaning two different things.
     One pill now does both: it selects, and its ✕ removes.

     Which is why the ✕ asks first. Removing a country deletes its services
     server-side, and a control you tap to navigate shouldn't destroy anything
     on a near miss. -->
<template>
  <section class="flex flex-col gap-3.5">
    <div class="flex flex-col gap-1">
      <h2 class="text-base font-bold text-primary">
        {{ $t("profile.countries.title") }}
      </h2>
      <p class="text-sm text-secondary">
        {{ $t("profile.countries.description") }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span
        v-for="country in countries"
        :key="country.code"
        class="flex h-9 items-center gap-1 rounded-full pl-4 pr-1.5 text-sm font-medium transition"
        :class="
          country.code === selectedCode
            ? 'bg-brand text-page'
            : 'bg-surface-elevated text-primary ring-1 ring-border'
        "
      >
        <button
          type="button"
          :aria-pressed="country.code === selectedCode"
          @click="selectedCode = country.code"
        >
          {{ countryName(country.code, country.name) }}
        </button>
        <button
          type="button"
          class="grid h-6 w-6 place-items-center rounded-full transition hover:bg-black/20"
          :disabled="disabled"
          :aria-label="
            $t('common.removeCountry', {
              country: countryName(country.code, country.name),
            })
          "
          @click="askRemove(country.code)"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </span>

      <CountryPicker
        :options="addableCountries"
        :placeholder="`+ ${$t('profile.countries.add')}`"
        :disabled="disabled"
        @update:model-value="$emit('add', $event)"
      />
    </div>

    <!-- The heading is static text, so it can be drawn before the data and
         reserve its own height. Only the list needs standing in for, and it
         has a known one — the scroller is exactly five rows tall. Without
         this the section goes from one line of "no countries yet" to some
         360px the moment the profile resolves, and on a slow connection
         that lands after first paint: everything below it jumps. -->
    <template v-if="loading || selectedCode">
      <div class="flex flex-col gap-1">
        <h3 class="text-base font-bold text-primary">
          {{ $t("profile.streamingServices.title") }}
        </h3>
        <p class="text-sm text-secondary">
          {{ $t("profile.streamingServices.description") }}
        </p>
      </div>

      <div
        v-if="loading"
        class="h-[312px] animate-pulse rounded-2xl bg-surface-elevated motion-reduce:animate-none"
      />
      <ServiceSelectorSection
        v-else-if="selectedCode"
        :key="selectedCode"
        :country-code="selectedCode"
      />
    </template>
    <p v-else class="text-sm text-secondary">
      {{ $t("profile.countries.empty") }}
    </p>

    <ConfirmDialog
      v-if="pendingRemoval"
      :title="$t('profile.countries.removeConfirm.title')"
      :description="
        $t('profile.countries.removeConfirm.description', {
          country: countryName(pendingRemoval),
        })
      "
      :confirm-label="$t('common.delete')"
      danger
      :pending="disabled"
      @close="pendingRemoval = null"
      @confirm="confirmRemove"
    />
  </section>
</template>

<script setup lang="ts">
import type { CountryItem, ProfileCountry } from "@foundit/types";

const props = defineProps<{
  countries: ProfileCountry[];
  catalog: CountryItem[];
  loading?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{ add: [code: string]; remove: [code: string] }>();

const { countryName: displayCountryName, sortByCountryName } = useCountryName();

// The API's catalog is English-only, so its name is a fallback for a code Intl
// doesn't recognise.
function countryName(code: string, fallback?: string): string {
  return displayCountryName(
    code,
    fallback ?? props.catalog.find((c) => c.code === code)?.name,
  );
}

const selectedCode = ref<string | null>(null);

// Follows the list: the first country when there's none selected, and away
// from one that has just been removed.
watchEffect(() => {
  const codes = props.countries.map((c) => c.code);
  if (!selectedCode.value || !codes.includes(selectedCode.value)) {
    selectedCode.value = codes[0] ?? null;
  }
});

const addableCountries = computed(() =>
  sortByCountryName(
    props.catalog.filter(
      (c) => !props.countries.some((selected) => selected.code === c.code),
    ),
    (c) => c.code,
  ).map((c) => ({ code: c.code, name: countryName(c.code, c.name) })),
);

const pendingRemoval = ref<string | null>(null);

function askRemove(code: string) {
  pendingRemoval.value = code;
}

function confirmRemove() {
  if (!pendingRemoval.value) return;
  emit("remove", pendingRemoval.value);
  pendingRemoval.value = null;
}
</script>

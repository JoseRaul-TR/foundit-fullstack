<!-- apps/web/app/components/profile/AgeRatingSelect.vue -->
<template>
  <div ref="wrapperRef" class="relative inline-block">
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary disabled:opacity-50"
      :disabled="disabled || countries.length === 0"
      @click="open = !open"
    >
      <span v-if="selectedCountry">
        {{ countryName(selectedCountry.code, selectedCountry.name) }}
      </span>
      <span v-else class="text-secondary">
        {{ $t("profile.ageRating.selectPlaceholder") }}
      </span>
      <span class="text-secondary">⌄</span>
    </button>

    <div
      v-if="open"
      class="absolute top-full z-20 mt-1 w-48 rounded-xl border border-border bg-surface shadow-xl"
    >
      <ul class="max-h-56 overflow-y-auto py-1">
        <li v-for="country in sortedCountries" :key="country.code">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-page"
            @click="select(country.code)"
          >
            {{ countryName(country.code, country.name) }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfileCountry } from "@foundit/types";

const props = defineProps<{
  modelValue: string | null;
  countries: ProfileCountry[];
  disabled?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const open = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);
useClickOutside(wrapperRef, () => {
  open.value = false;
});

const { countryName, sortByCountryName } = useCountryName();

const sortedCountries = computed(() =>
  sortByCountryName(props.countries, (c) => c.code),
);

const selectedCountry = computed(
  () => props.countries.find((c) => c.code === props.modelValue) ?? null,
);

function select(code: string) {
  emit("update:modelValue", code);
  open.value = false;
}
</script>

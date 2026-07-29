<!-- apps/web/app/components/profile/CountrySelector.vue -->
<template>
  <div ref="wrapperRef" class="relative flex flex-wrap items-center gap-2">
    <span
      v-for="code in modelValue"
      :key="code"
      class="flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1.5 text-xs text-primary"
    >
      {{ flagEmoji(code) }} {{ countryName(code) }}
      <button
        type="button"
        class="text-secondary hover:text-primary disabled:opacity-50"
        :disabled="disabled"
        :aria-label="`${$t('common.delete')} ${countryName(code)}`"
        @click="remove(code)"
      >
        ✕
      </button>
    </span>

    <button
      type="button"
      class="rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary disabled:opacity-50"
      :disabled="disabled"
      @click="open = !open"
    >
      + {{ $t("profile.countries.add") }}
    </button>

    <span v-if="modelValue.length === 0" class="text-sm text-secondary">
      {{ $t("profile.countries.empty") }}
    </span>

    <div
      v-if="open"
      class="absolute top-full z-20 mt-1 w-64 rounded-xl border border-border bg-surface shadow-xl"
    >
      <input
        v-model="search"
        type="text"
        class="w-full border-b border-border bg-transparent px-3 py-2 text-sm text-primary"
        :placeholder="$t('common.search')"
        autofocus
        @keydown.escape="open = false"
      />
      <ul class="max-h-56 overflow-y-auto py-1">
        <li v-for="country in filteredCountries" :key="country.code">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-page"
            @click="select(country.code)"
          >
            {{ flagEmoji(country.code) }} {{ country.name }}
          </button>
        </li>
        <li
          v-if="filteredCountries.length === 0"
          class="px-3 py-2 text-sm text-secondary"
        >
          {{ $t("search.noResults") }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CountryItem } from "@foundit/types";

const props = defineProps<{
  modelValue: string[];
  countries: CountryItem[];
  disabled?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

const open = ref(false);
const search = ref("");
const wrapperRef = ref<HTMLElement | null>(null);

useClickOutside(wrapperRef, () => {
  open.value = false;
});

function countryName(code: string): string {
  return props.countries.find((c) => c.code === code)?.name ?? code;
}

// ISO 3166-1 alpha-2 -> regional indicator flag emoji.
function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const availableCountries = computed(() =>
  props.countries.filter((c) => !props.modelValue.includes(c.code)),
);

const filteredCountries = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return availableCountries.value;
  return availableCountries.value.filter((c) =>
    c.name.toLowerCase().includes(query),
  );
});

function select(code: string) {
  emit("update:modelValue", [...props.modelValue, code]);
  search.value = "";
  open.value = false;
}

function remove(code: string) {
  emit(
    "update:modelValue",
    props.modelValue.filter((c) => c !== code),
  );
}
</script>

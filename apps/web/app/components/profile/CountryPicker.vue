<!-- apps/web/app/components/profile/CountryPicker.vue -->
<!-- One picker for both country lists. They were two components doing the same
     thing at different widths, one with a search field and one without, which
     made the same gesture look like two.

     The search appears once the list is long enough to need it: with three
     countries a search box is furniture, with sixty it's the only way in. -->
<template>
  <div ref="wrapperRef" class="relative">
    <button
      type="button"
      class="flex h-9 items-center gap-2 rounded-full bg-surface-elevated px-4 text-sm font-medium text-primary ring-1 ring-border transition hover:ring-primary/40 disabled:opacity-50"
      :disabled="disabled || options.length === 0"
      :aria-expanded="open"
      @click="toggle"
    >
      {{ selectedLabel ?? placeholder }}
      <svg
        class="h-4 w-4 text-secondary transition-transform"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
    >
      <input
        v-if="showSearch"
        ref="searchRef"
        v-model="search"
        type="text"
        class="w-full border-b border-border bg-transparent px-3 py-2.5 text-base text-primary focus:outline-none sm:text-sm"
        :placeholder="$t('common.search')"
        @keydown.escape="close"
      />
      <ul class="max-h-56 overflow-y-auto py-1">
        <li v-for="option in filtered" :key="option.code">
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm text-primary transition hover:bg-page"
            @click="select(option.code)"
          >
            {{ option.name }}
          </button>
        </li>
        <li
          v-if="filtered.length === 0"
          class="px-3 py-2 text-sm text-secondary"
        >
          {{ $t("search.noResults") }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CountryOption {
  code: string;
  name: string;
}

const props = defineProps<{
  /** Already translated and sorted by the caller. */
  options: CountryOption[];
  /** Null in "add" mode, where the pill keeps showing its placeholder. */
  modelValue?: string | null;
  placeholder: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [code: string] }>();

const SEARCH_THRESHOLD = 12;

const open = ref(false);
const search = ref("");
const wrapperRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);

useClickOutside(wrapperRef, close);

const showSearch = computed(() => props.options.length > SEARCH_THRESHOLD);

const selectedLabel = computed(
  () => props.options.find((o) => o.code === props.modelValue)?.name ?? null,
);

// Diacritics are stripped on both sides so "Espana" finds España and "Aland"
// finds Åland — otherwise the search punishes anyone not typing the accents.
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const filtered = computed(() => {
  const query = normalize(search.value.trim());
  if (!query) return props.options;
  return props.options.filter((o) => normalize(o.name).includes(query));
});

function toggle() {
  open.value = !open.value;
  if (open.value && showSearch.value) {
    void nextTick(() => searchRef.value?.focus());
  }
}

function close() {
  open.value = false;
  search.value = "";
}

function select(code: string) {
  emit("update:modelValue", code);
  close();
}
</script>

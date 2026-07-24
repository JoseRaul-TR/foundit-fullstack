<!-- apps/web/app/components/SearchBar.vue -->
<template>
  <div class="flex flex-col items-center gap-2.5">
    <div
      class="relative w-full max-w-[560px] rounded-full transition-shadow"
      :class="
        isActiveState
          ? 'border-[1.5px] border-brand bg-brand/[0.08] shadow-[0_4px_4px_rgba(0,0,0,0.25)]'
          : 'border-[1.5px] border-transparent bg-surface/20 shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:shadow-[0_0_12px_rgba(232,163,61,0.35)] active:shadow-[0_0_12px_rgba(232,163,61,0.35)]'
      "
    >
      <svg
        class="pointer-events-none absolute left-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-brand"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        v-model="inputValue"
        type="text"
        :placeholder="$t('search.placeholder')"
        class="h-10 w-full bg-transparent pl-11 pr-10 text-sm text-primary placeholder:text-secondary focus:outline-none"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown.enter="submit"
      />

      <button
        v-if="inputValue"
        type="button"
        class="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary transition hover:text-primary"
        @click="clearInput"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const search = useSearch();

const inputValue = ref("");
const isFocused = ref(false);

const isActiveState = computed(
  () => isFocused.value || inputValue.value.length > 0,
);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(inputValue, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (value.trim().length >= 3) submit();
  }, 400);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

function submit() {
  const trimmed = inputValue.value.trim();
  if (trimmed.length < 3) return;
  // Always starts broad; index.vue's type pills narrow it down afterward.
  search.search(trimmed, "multi");
}

function clearInput() {
  inputValue.value = "";
  if (debounceTimer) clearTimeout(debounceTimer);
  search.clear();
}
</script>

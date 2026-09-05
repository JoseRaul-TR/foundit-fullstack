<!-- apps/web/app/components/search/SearchBar.vue -->
<!-- SearchPill, Figma 129:274. Three states in the drawing, and they map onto
     CSS almost directly: rest, a gold glow on hover, and a gold outline with a
     gold wash once it has focus or content. What the wireframe calls "Active"
     is two separate things in a browser — being focused and holding text — so
     both drive the same appearance here.

     The outline is a ring rather than a border, and there is none at rest. A
     border would reserve 1.5px of layout in every state to avoid shifting the
     contents on focus; a ring is a box-shadow, so it costs no space at all and
     fades in with the glow instead of appearing at once.

     The fill departs from the wireframe. There the pill is `surface` at 20%,
     which reads over the backdrop it was drawn on and disappears over a flat
     near-black page — the two differ by under 2% of luminance. A solid
     `surface-elevated` gives it a shape, and matches the footer's language
     selector, which is the same kind of object: a rounded control you can act
     on. Gold stays reserved for state, as it is everywhere else in the app. -->
<template>
  <form
    role="search"
    class="flex w-full flex-col items-center gap-2.5"
    @submit.prevent="submit"
  >
    <div
      class="relative w-full max-w-[560px] rounded-full transition-shadow has-[:focus-visible]:shadow-[0_0_0_3px_rgba(232,163,61,0.35),0_4px_4px_rgba(0,0,0,0.25)]"
      :class="
        isActiveState
          ? 'bg-surface-elevated bg-gradient-to-br from-brand/10 to-transparent shadow-[0_4px_4px_rgba(0,0,0,0.25)] ring-[1.5px] ring-inset ring-brand'
          : 'bg-surface-elevated shadow-[0_4px_2px_rgba(0,0,0,0.25)] hover:shadow-[0_0_12px_rgba(232,163,61,0.35)] active:shadow-[0_0_12px_rgba(232,163,61,0.35)]'
      "
    >
      <svg
        class="pointer-events-none absolute left-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-brand"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <!-- type="search" for the sake of the on-screen keyboard, which turns
           its return key into a search key. Its native clear button is hidden
           because there is already one here that also resets the route.

           16px on phones and the wireframe's 14 from `sm`: iOS Safari zooms
           the viewport when a field smaller than 16px takes focus, and a
           zoomed page scrolls sideways. The type size is the fix for a layout
           bug, not a design preference.

           Autocorrect and auto-capitalisation are off because the input is
           titles and proper nouns, which is precisely what they get wrong.

           The global focus ring is switched off here and handled by the
           wrapper instead. On the input it draws around the field's own box,
           which is a rectangle inside a pill — the radius belongs to the
           wrapper. The wrapper's gold ring alone wasn't enough either: it
           reports focus *or* content, so tabbing into a field that already
           has text changed nothing on screen. The `has-[:focus-visible]`
           halo is the part that only ever means focus.-->
      <input
        id="search-query"
        ref="inputRef"
        v-model="inputValue"
        name="q"
        type="search"
        enterkeyhint="search"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        :placeholder="$t('search.placeholder')"
        :aria-label="$t('search.placeholder')"
        class="h-10 w-full appearance-none bg-transparent pl-11 pr-10 text-base text-primary placeholder:text-secondary focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />

      <!-- 32px of target for a 16px glyph: 24 sits on the floor of the touch
           guidelines rather than anywhere comfortable. -->
      <button
        v-if="inputValue"
        type="button"
        class="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-secondary transition hover:text-primary"
        :aria-label="$t('common.clearSearch')"
        @click="clearInput"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
const search = useSearch();

const inputRef = ref<HTMLInputElement | null>(null);
// Seeded from the store rather than from an empty string: index.vue resolves
// the query during SSR, so a shared /?q=… link arrives with results already
// rendered, and a box that started empty would contradict them.
const inputValue = ref(search.query.value);
const isFocused = ref(false);

// The URL is the source of truth, and it changes without anyone typing — the
// back button, a shared link, the clear action. Assigning only when the values
// differ keeps this from re-triggering the debounce that wrote the URL in the
// first place.
watch(search.query, (value) => {
  if (value !== inputValue.value.trim()) inputValue.value = value;
});

const isActiveState = computed(
  () => isFocused.value || inputValue.value.length > 0,
);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(inputValue, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const trimmed = value.trim();
    // Both directions, and the same threshold in each. This only ever acted
    // upward: under three characters it did nothing at all, so emptying the
    // field by hand left the URL still carrying the old query. The route never
    // changed, index.vue's watcher never fired, and the page went on rendering
    // results for a search the field no longer showed. Clearing with the ✕
    // worked only because that button calls search.clear() itself, which is
    // why the failure looked like it depended on the phase of the moon.
    //
    // The guard on `search.query` is what keeps typing up from an empty field
    // from navigating on every keystroke: there is only something to clear if
    // a search is actually in effect.
    if (trimmed.length >= 3) submit();
    else if (search.query.value) search.clear();
  }, 400);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

function submit() {
  const trimmed = inputValue.value.trim();
  if (trimmed.length < 3) return;
  // No type argument: useSearch resolves it from the URL, so editing a query
  // refines the search you already had instead of widening it back to
  // everything. Clearing the box is the other path, and that one does reset —
  // `clear()` navigates to `/` without a type.
  search.search(trimmed);
}

function clearInput() {
  inputValue.value = "";
  if (debounceTimer) clearTimeout(debounceTimer);
  // Focus goes back where the user was, instead of to the top of the document.
  inputRef.value?.focus();
  search.clear();
}
</script>

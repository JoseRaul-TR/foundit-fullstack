<!-- apps/web/app/components/ui/SegmentedControl.vue -->
<!-- Segmented control: the options sit inside a single track and the active
     one is marked by a thumb that slides between them instead of the fill
     jumping from pill to pill. The movement itself lives in useSlidingThumb,
     shared with the navbar.

     Announced as a radio group (#282). Every caller is a mutually exclusive
     choice: the sort in Discover's filters, and a filter by type on Discover,
     search, the watchlist and the history. Discover's Movies/Series selector
     was the one candidate for tabs, since it swaps the section below it, but
     there is no tabpanel for it to control and its own label calls it a
     filter. Declaring tabs would have meant building that structure only to
     justify the role.

     The role comes with its keyboard contract, implemented here: one tab stop
     for the group, arrow keys move and select, focus follows the selection.
     Because selecting follows focus, an arrow press is a real change: on the
     callers that push to history, crossing an option leaves an entry for it.
     Native radios on a form that navigates on change do the same, and whether
     a filter pushes or replaces is the caller's decision, not this
     component's. -->
<template>
  <div
    ref="rootRef"
    class="relative inline-flex items-center rounded-full bg-surface-elevated p-1"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <span
      v-if="thumb.ready"
      class="pointer-events-none absolute bottom-1 top-1 rounded-full bg-brand"
      :class="
        animate
          ? 'transition-[left,width] duration-200 ease-out motion-reduce:transition-none'
          : ''
      "
      :style="{ left: `${thumb.left}px`, width: `${thumb.width}px` }"
      aria-hidden="true"
    />

    <button
      v-for="(option, index) in options"
      :key="option.value"
      data-thumb-item
      type="button"
      role="radio"
      class="relative z-10 whitespace-nowrap rounded-full font-semibold transition-colors"
      :class="[
        size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-3.5 py-2 text-[13px]',
        option.value === modelValue
          ? // text-page is near-black: readable on the gold thumb, invisible
            // on the track. Before hydration there is no thumb, so the active
            // option falls back to the brand colour instead.
            thumb.ready
            ? 'text-page'
            : 'text-brand'
          : 'text-secondary hover:text-primary',
      ]"
      :aria-checked="option.value === modelValue"
      :tabindex="index === tabStopIndex ? 0 : -1"
      @click="emit('update:modelValue', option.value)"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: readonly { value: T; label: string }[];
    ariaLabel?: string;
    size?: "sm" | "md";
  }>(),
  { ariaLabel: undefined, size: "md" },
);

const emit = defineEmits<{ "update:modelValue": [T] }>();

const activeIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue),
);

const { rootRef, thumb, animate, measure } = useSlidingThumb(activeIndex);

// One tab stop for the whole group. The checked option holds it; when nothing
// matches modelValue the first one does, or the group could not be reached
// from the keyboard at all.
const tabStopIndex = computed(() => Math.max(activeIndex.value, 0));

const STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

// The next option is counted from the button that received the key, not from
// modelValue. Every caller that writes to the URL confirms the new value only
// after the navigation — search even after its store has reloaded — so two
// quick presses counted from modelValue would both land on the same option.
function onKeydown(event: KeyboardEvent, index: number) {
  // Modified arrows belong to the browser and the OS: Alt+Left is Back on
  // Windows and Linux, and swallowing it here would break it for the whole
  // page while focus sits in the group.
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const step = STEP[event.key];
  if (step === undefined) return;
  // Up and Down would otherwise scroll the page as well as move the selection.
  event.preventDefault();

  const count = props.options.length;
  const next = (index + step + count) % count;
  const option = props.options[next];
  if (!option) return;

  rootRef.value
    ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    [next]?.focus();
  emit("update:modelValue", option.value);
}

// The option count is fixed in every current caller, but a label changing
// length on a locale switch is not something the observer can attribute to a
// specific item, so re-measure whenever the list object itself changes.
watch(
  () => props.options,
  () => void nextTick(measure),
  { deep: true },
);
</script>

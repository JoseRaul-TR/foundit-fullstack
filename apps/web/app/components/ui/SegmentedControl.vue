<!-- apps/web/app/components/ui/SegmentedControl.vue -->
<!-- Segmented control: the options sit inside a single track and the active
     one is marked by a thumb that slides between them instead of the fill
     jumping from pill to pill. The movement itself lives in useSlidingThumb,
     shared with the navbar. -->
<template>
  <div
    ref="rootRef"
    class="relative inline-flex items-center rounded-full bg-surface-elevated p-1"
    role="group"
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
      v-for="option in options"
      :key="option.value"
      data-thumb-item
      type="button"
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
      :aria-pressed="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
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

// The option count is fixed in every current caller, but a label changing
// length on a locale switch is not something the observer can attribute to a
// specific item, so re-measure whenever the list object itself changes.
watch(
  () => props.options,
  () => void nextTick(measure),
  { deep: true },
);
</script>

<!-- apps/web/app/components/ui/SegmentedControl.vue -->
<!-- Segmented control: the options sit inside a single track and the active
     one is marked by a thumb that slides between them instead of the fill
     jumping from pill to pill.

     The thumb is measured rather than sized as 100/n %: the labels differ a
     lot in width ("All" vs "People", and more so in Swedish), and forcing
     every option to the width of the longest one wastes space. The cost is
     that there is no measurement during SSR -- so until hydration the active
     option is marked by text colour alone, and the thumb appears already in
     place rather than sliding in from the left. -->
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

const rootRef = ref<HTMLElement | null>(null);
const thumb = reactive({ left: 0, width: 0, ready: false });
const animate = ref(false);

// Queried by index rather than by a collection of template refs: the array a
// v-for ref produces is not guaranteed to follow source order, and the index
// is the one thing that always matches `options`.
function measure() {
  const root = rootRef.value;
  if (!root) return;
  const index = props.options.findIndex((o) => o.value === props.modelValue);
  if (index === -1) {
    thumb.ready = false;
    return;
  }
  const el = root.querySelectorAll<HTMLElement>("button")[index];
  if (!el) return;
  // offsetLeft is relative to the track, which is the offsetParent, so the
  // track's own padding is already accounted for.
  thumb.left = el.offsetLeft;
  thumb.width = el.offsetWidth;
  thumb.ready = true;
}

let observer: ResizeObserver | null = null;

onMounted(() => {
  measure();
  // Enable the transition one frame after the first placement, otherwise the
  // thumb animates in from the left edge every time the component hydrates.
  requestAnimationFrame(() => {
    animate.value = true;
  });

  observer = new ResizeObserver(() => measure());
  const root = rootRef.value;
  if (root) {
    // The track catches font loading and viewport changes; the buttons catch
    // label changes on a locale switch, which alter width without altering
    // the track's own size.
    observer.observe(root);
    root.querySelectorAll("button").forEach((el) => observer?.observe(el));
  }
});

watch(
  () => [props.modelValue, props.options],
  () => nextTick(measure),
  { deep: true },
);

onUnmounted(() => observer?.disconnect());
</script>

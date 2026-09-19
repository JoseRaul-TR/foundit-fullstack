<!-- apps/web/app/components/media-detail/CollapsableSection.vue -->
<!-- A list of sections separated by rules, which is why it carries no margins
     of its own: the rule is the separator, and its callers wrap these in a
     column with no gap. Until #310 the container's gap and this padding were
     separating the same two things twice, so a collapsed section cost 88px to
     show a 24px title — six of them were most of a phone screen of nothing. -->
<template>
  <section class="border-t border-border py-4 first:border-t-0 first:pt-0">
    <button
      v-if="collapsible"
      type="button"
      class="flex w-full items-center justify-between text-left"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="isOpen = !isOpen"
    >
      <h3 class="text-base font-semibold text-primary">{{ title }}</h3>
      <svg
        class="h-[18px] w-[18px] shrink-0 text-secondary transition-transform"
        :class="{ 'rotate-180': isOpen }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    <h3 v-else class="text-base font-semibold text-primary">{{ title }}</h3>

    <div :id="panelId" v-show="isOpen" class="mt-4">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    defaultOpen?: boolean;
    collapsible?: boolean;
  }>(),
  { defaultOpen: false, collapsible: true },
);

const panelId = useId();

// Deliberately not derived from viewport width any more. It used to be
// `window.innerWidth >= 640`, which doesn't exist on the server: the HTML went
// out with every section open and the client closed them again while
// hydrating. And a default that depends on screen size says "there is room
// here" rather than "this matters" — the same page claimed a different
// hierarchy on each device.
//
// `collapsible: false` gives the overview the same heading and rule as every
// other section without a control nobody wants to use: closing the synopsis
// isn't a thing people do.
const isOpen = ref(props.collapsible ? props.defaultOpen : true);
</script>

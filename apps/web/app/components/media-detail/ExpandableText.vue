<!-- apps/web/app/components/media-detail/ExpandableText.vue -->
<!-- Long prose with a "read more" that used to live only in the person modal's
     biography, while the overview beside it ran to whatever length TMDB felt
     like. Same problem, so the same component.

     Truncation is by character count rather than by clamped lines. Clamping
     looks better — it respects the actual layout — but deciding whether to
     show the button then means measuring the rendered height, which the server
     can't do: the control would appear only after hydration. A count is crude
     and identical everywhere, and we've just spent a commit removing that
     class of divergence from CollapsableSection. -->
<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm leading-relaxed text-primary">{{ displayed }}</p>
    <button
      v-if="isLong"
      type="button"
      class="w-fit text-[13px] font-bold text-secondary transition hover:text-primary"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? $t("mediaDetail.readLess") : $t("mediaDetail.readMore") }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ text: string; limit?: number }>(), {
  limit: 280,
});

const expanded = ref(false);

const isLong = computed(() => props.text.length > props.limit);

const displayed = computed(() =>
  !isLong.value || expanded.value
    ? props.text
    : `${props.text.slice(0, props.limit).trimEnd()}…`,
);
</script>

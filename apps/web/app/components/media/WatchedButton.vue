<template>
  <button
    type="button"
    :aria-pressed="active"
    class="flex items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-5 py-[11px] text-sm font-bold transition"
    :class="
      active
        ? 'border-success bg-success/[0.08] text-success'
        : 'border-border text-primary hover:border-primary/40'
    "
    :disabled="pending"
    @click="$emit('toggle')"
  >
    <span class="text-lg leading-none">{{ active ? "✓" : "○" }}</span>
    {{ active ? resolvedActiveLabel : resolvedInactiveLabel }}
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  active: boolean;
  pending: boolean;
  // A series marks every season at once, so it needs to say so. Defaults keep
  // the movie's wording without every caller repeating it.
  activeLabel?: string;
  inactiveLabel?: string;
}>();
defineEmits<{ toggle: [] }>();

const { t } = useI18n();
const resolvedActiveLabel = computed(
  () => props.activeLabel ?? t("mediaDetail.watched"),
);
const resolvedInactiveLabel = computed(
  () => props.inactiveLabel ?? t("mediaDetail.markWatched"),
);
</script>

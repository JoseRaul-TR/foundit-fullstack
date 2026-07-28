<!-- apps/web/app/components/media/RatingStars.vue -->
<!-- 5 stars, half star precission -> exact scale 1-10 (left half = uneven, right half = even) -->
<template>
  <div class="flex items-center gap-2">
    <div
      class="flex items-center"
      :class="sizeClasses.gap"
      :tabindex="props.readonly ? undefined : 0"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="10"
      :aria-valuenow="modelValue ?? 0"
      :aria-label="$t('mediaDetail.yourRating', { rating: modelValue ?? 0 })"
      @mouseleave="hoverValue = null"
      @keydown="handleKeydown"
    >
      <button
        v-for="star in 5"
        :key="star"
        type="button"
        tabindex="-1"
        class="relative"
        :class="sizeClasses.button"
        :disabled="props.readonly"
        @mousemove="!props.readonly && handleHover($event, star)"
        @click="!props.readonly && handleClick($event, star)"
      >
        <svg
          viewBox="0 0 24 24"
          class="absolute inset-0 h-full w-full text-border"
          fill="currentColor"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
          />
        </svg>
        <svg
          v-if="displayValue(star) > 0"
          viewBox="0 0 24 24"
          class="absolute inset-0 h-full w-full text-brand"
          fill="currentColor"
          :style="{
            clipPath: displayValue(star) === 1 ? 'none' : 'inset(0 50% 0 0)',
          }"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
          />
        </svg>
      </button>
    </div>
    <span v-if="modelValue === null" class="text-xs text-secondary">
      {{ $t("mediaDetail.rateThis") }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number | null; // scale 1-10
    readonly?: boolean;
    size?: "sm" | "md" | "lg";
  }>(),
  { size: "md" },
);

const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();

const SIZE_CLASSES: Record<
  "sm" | "md" | "lg",
  { button: string; gap: string }
> = {
  sm: { button: "h-4 w-4", gap: "gap-0.5" },
  md: { button: "h-6 w-6", gap: "gap-1" },
  lg: { button: "h-8 w-8", gap: "gap-1.5" },
};
const sizeClasses = computed(() => SIZE_CLASSES[props.size]);

const hoverValue = ref<number | null>(null);
const activeValue = computed(() => hoverValue.value ?? props.modelValue ?? 0);

function displayValue(star: number): number {
  const starFloor = (star - 1) * 2;
  const remaining = activeValue.value - starFloor;
  if (remaining >= 2) return 1;
  if (remaining >= 1) return 0.5;
  return 0;
}

function pointsFromEvent(event: MouseEvent, star: number): number {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const isLeftHalf = event.clientX - rect.left < rect.width / 2;
  return isLeftHalf ? star * 2 - 1 : star * 2;
}

function handleHover(event: MouseEvent, star: number) {
  hoverValue.value = pointsFromEvent(event, star);
}

// Clicking the star combination that reproduces the CURRENT modelValue
// clears the rating instead of re-setting it to the same value — the
// ticket's "click same rating again to clear" behavior.
function handleClick(event: MouseEvent, star: number) {
  const points = pointsFromEvent(event, star);
  emit("update:modelValue", points === props.modelValue ? null : points);
}

function handleKeydown(event: KeyboardEvent) {
  if (props.readonly) return;
  const current = props.modelValue ?? 0;

  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    emit("update:modelValue", Math.min(10, current + 1));
  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    const next = current - 1;
    emit("update:modelValue", next <= 0 ? null : next);
  }
}
</script>

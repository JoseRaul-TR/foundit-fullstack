<!-- apps/web/app/components/media/RatingStars.vue -->
<!-- 5 stars, half star precission -> exact scale 1-10 (left half = uneven, right half = even) -->
<template>
  <div class="flex items-center gap-1" @mouseleave="hoverValue = null">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      class="relative h-6 w-6"
      :disabled="readonly"
      @mousemove="!readonly && handleHover($event, star)"
      @click="!readonly && handleClick($event, star)"
    >
      <svg
        viewBox="0 0 24 24"
        class="absolute inset-0 h-6 w-6 text-border"
        fill="currentColor"
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
        />
      </svg>
      <svg
        v-if="displayValue(star) > 0"
        viewBox="0 0 24 24"
        class="absolute inset-0 h-6 w-6 text-brand"
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
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number | null; // scale 1-10
  readonly?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

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

function handleClick(event: MouseEvent, star: number) {
  emit("update:modelValue", pointsFromEvent(event, star));
}
</script>

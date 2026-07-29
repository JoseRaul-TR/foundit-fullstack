<!-- apps/web/app/components/media/WatchlistButton.vue -->
<template>
  <button
    type="button"
    :aria-pressed="active"
    class="flex items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-5 py-[11px] text-sm font-bold transition"
    :class="
      active
        ? 'border-brand bg-brand/[0.08] text-brand'
        : 'border-border text-primary hover:border-primary/40'
    "
    :disabled="pending"
    @click="$emit('toggle')"
  >
    <span class="text-lg leading-none">{{ active ? "✓" : "+" }}</span>
    {{
      active ? $t("mediaDetail.inWatchlist") : $t("mediaDetail.addToWatchlist")
    }}
  </button>
</template>

<script setup lang="ts">
defineProps<{ active: boolean; pending: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

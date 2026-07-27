<!-- apps/web/app/components/media/WatchedButton.vue -->
<template>
  <button
    type="button"
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
    {{ active ? $t("mediaDetail.watched") : $t("mediaDetail.markWatched") }}
  </button>
</template>

<script setup lang="ts">
defineProps<{ active: boolean; pending: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

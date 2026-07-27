<!-- apps/web/app/components/media/PersonCard.vue -->
<!-- Distinto de MediaCard: foto circular + nombre + rol, para scroll horizontal de Cast/Crew -->
<template>
  <button
    type="button"
    class="flex w-[110px] shrink-0 flex-col items-center gap-2 text-center"
    @click="mediaModal.open(id, 'person')"
  >
    <span
      class="relative block h-[110px] w-[110px] overflow-hidden rounded-full bg-surface-elevated"
    >
      <img
        v-if="photoUrl"
        :src="photoUrl"
        :alt="name"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <svg
        v-else
        class="absolute inset-0 m-auto h-8 w-8 text-border"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
      </svg>
    </span>
    <span class="line-clamp-1 text-[13px] font-semibold text-primary">{{
      name
    }}</span>
    <span class="line-clamp-1 text-xs text-secondary">{{ roleLabel }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: number;
  name: string;
  profilePath: string | null;
  roleLabel: string;
}>();

const mediaModal = useMediaModal();
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

const photoUrl = computed(() =>
  props.profilePath ? `${TMDB_IMAGE_BASE}${props.profilePath}` : null,
);
</script>

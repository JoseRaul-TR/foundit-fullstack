<!-- apps/web/app/components/media/PersonCard.vue -->
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
      <MediaPlaceholder
        v-else
        kind="person"
        size="sm"
        class="h-full w-full rounded-[inherit]"
      />
    </span>

    <!-- Two lines each, not one. A single line was enough while a crew member
         had exactly one job; now they can have several and "Director,
         Screenplay" doesn't fit in 110px, so the clamp was cutting the role
         before the first word ended. The photos stay aligned because the card
         grows downwards, and `title` still carries the untruncated text. -->
    <span class="flex flex-col gap-0.5">
      <span
        class="line-clamp-2 text-[13px] font-semibold leading-snug text-primary"
      >
        {{ name }}
      </span>
      <span
        class="line-clamp-2 text-xs leading-snug text-secondary"
        :title="roleTitle ?? roleLabel"
      >
        {{ roleLabel }}
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: number;
  name: string;
  profilePath: string | null;
  roleLabel: string;
  roleTitle?: string;
}>();

const mediaModal = useMediaModal();
// w185 for a 110px circle. No srcset: TMDB's only smaller portrait width is
// w45, which is too small at any pixel ratio, so the browser would have
// nothing to choose between.
const photoUrl = computed(() => tmdbImage(props.profilePath, 185));
</script>

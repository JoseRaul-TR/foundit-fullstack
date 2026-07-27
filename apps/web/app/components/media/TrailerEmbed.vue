<!-- apps/web/app/components/media/TrailerEmbed.vue -->
<template>
  <div
    class="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-elevated"
  >
    <iframe
      v-if="loaded"
      class="absolute inset-0 h-full w-full"
      :src="`https://www.youtube.com/embed/${youtubeKey}?autoplay=1`"
      title="Trailer"
      frameborder="0"
      allow="
        accelerometer;
        autoplay;
        clipboard-write;
        encrypted-media;
        gyroscope;
        picture-in-picture;
      "
      allowfullscreen
    />
    <button
      v-else
      type="button"
      class="absolute inset-0 flex items-center justify-center"
      @click="loaded = true"
    >
      <span
        class="grid h-16 w-16 place-items-center rounded-full bg-brand transition hover:brightness-110"
      >
        <svg
          class="h-6 w-6 translate-x-0.5 text-page"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ youtubeKey: string }>();
const loaded = ref(false); // iframe solo se monta tras interacción -> "loads lazily, not on page load"
</script>

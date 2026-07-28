<!-- apps/web/app/components/media/TrailerEmbed.vue -->
<template>
  <div
    v-if="youtubeKey"
    class="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-elevated"
  >
    <iframe
      v-if="loaded"
      class="absolute inset-0 h-full w-full"
      :src="`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1`"
      :title="title"
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
      :aria-label="$t('mediaDetail.showTrailer', { title })"
      @click="loaded = true"
    >
      <img
        :src="`https://i.ytimg.com/vi/${youtubeKey}/hqdefault.jpg`"
        :alt="title"
        class="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <span
        class="relative grid h-16 w-16 place-items-center rounded-full bg-brand transition hover:brightness-110"
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
defineProps<{ youtubeKey: string | null; title: string }>();
const loaded = ref(false); // iframe is only mounted after interaction -> "loads lazily, not on page load"
</script>

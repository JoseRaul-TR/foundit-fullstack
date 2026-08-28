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
      referrerpolicy="strict-origin-when-cross-origin"
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
/**
 * The iframe carries its own `referrerpolicy` (#286).
 *
 * helmet sets `Referrer-Policy: no-referrer` for the whole application, and
 * Express serves Nuxt's `.output` in production, so that header covers the
 * frontend too. YouTube refuses embedded playback without a Referer it can
 * check the embedding domain against — that is Google's own documented
 * requirement, not a guess — and returned an undocumented "Error 153" instead
 * of the video. It played in local dev, where Nuxt serves the app and helmet
 * is not in the path, which is what identified the header.
 * https://support.google.com/youtube/answer/171780
 *
 * The element attribute overrides the document policy for this element's
 * requests only, so YouTube gets the origin — no path — and every other
 * request the app makes still sends nothing at all. Relaxing the header in
 * app.ts would have worked too and been one line, but it would have widened
 * the policy for the whole application to fix one iframe. Same reasoning as
 * #264 used on the CSP: open exactly as far as the thing that broke needs.
 *
 * This is currently the only third-party frame in the app. If another is
 * added, that is the moment to reconsider the header instead.
 */
defineProps<{ youtubeKey: string | null; title: string }>();
const loaded = ref(false); // iframe is only mounted after interaction -> "loads lazily, not on page load"
</script>

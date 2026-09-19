<!-- apps/web/app/components/media/MediaPlaceholder.vue -->
<!-- The one "there is no image here" box. Six surfaces carried three
     treatments and three absences: a 40px photo glyph on a media card, a 32px
     person glyph absolutely positioned on a person card, a 64px one in the
     person hero, and nothing at all in the movie hero, the series hero or the
     season list. Only SeasonList's absence moved anything — its <img> carried
     its own dimensions with no wrapper, so a season with no poster collapsed
     the row. The two heroes held their size and showed a bare
     bg-surface-elevated rectangle, which is the skeleton's colour with
     nothing on it.

     It says what is missing, not merely that something is: a film strip, a
     screen, a silhouette. Every caller knows its own type — MediaCard's
     `mediaType` is exactly this union — so there is no generic fallback and
     no default: a placeholder that cannot say what it stands for is the
     thing this replaced.

     It never pulses, and its glyph is text-secondary rather than text-border.
     That second half is the whole repair, measured: text-border on
     bg-surface-elevated is 1.22:1, below anything the eye resolves as two
     greys. And MediaCard's poster box is itself bg-surface-elevated — the
     skeletons' own colour. So the old placeholder was not merely *like* a
     stalled skeleton: it was the same rectangle, at the same radius, in the
     same colour, carrying a mark nobody could see. A tester read it as an
     image still loading and waited (#314). text-secondary is 5.19:1 on that
     surface, 4.3x the old value.

     bg-surface and the ring do not carry that distinction and are not asked
     to: in this palette every surface sits within 1.15:1 of its neighbours
     and ring-border is 1.40:1 on bg-surface, so neither is resolvable at card
     size. The ring is here because it is the hairline this project draws
     every other edge with, not because it signals anything.

     One honest gap, recorded rather than implied: an `<img>` downloading
     inside a rendered card has no visual state at all. The skeletons cover
     the data, not the pixels. That is #347's territory, and the distinction
     survives without it because the glyph is now visible. -->
<template>
  <span
    class="grid place-items-center bg-surface ring-1 ring-inset ring-border"
  >
    <svg
      :class="glyphClass"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="kind === 'person'">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </template>
      <template v-else-if="kind === 'series'">
        <path d="M17 3l-5 5-5-5" />
        <rect x="2" y="8" width="20" height="13" rx="2" />
      </template>
      <template v-else>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 3v18M17 3v18" />
        <path d="M3 12h18" />
        <path d="M3 7.5h4M3 16.5h4M17 7.5h4M17 16.5h4" />
      </template>
    </svg>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  kind: "movie" | "series" | "person";
  /** The glyph. The box's own dimensions and radius belong to the caller. */
  size: "xs" | "sm" | "md" | "lg";
}>();

// text-secondary, not text-border. A glyph has to be seen to say anything,
// and text-border is the lowest-contrast colour in the palette — right for a
// hairline, wrong for the only mark in an otherwise empty box.
const GLYPH = {
  xs: "h-4 w-4 text-secondary",
  sm: "h-8 w-8 text-secondary",
  md: "h-10 w-10 text-secondary",
  lg: "h-16 w-16 text-secondary",
} as const;

const glyphClass = computed(() => GLYPH[props.size]);
</script>

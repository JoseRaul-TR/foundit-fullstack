<!-- apps/web/app/components/layout/FeedbackButton.vue -->
<template>
  <!--
    A zero-height sticky rail, not a fixed element (#312).

    `sticky bottom-0` on a `h-0` wrapper pins the button to the bottom of the
    viewport while `main` is on screen, and lets it rise with the document the
    moment `main` ends — so it comes to rest above the footer instead of on top
    of it. No observer, no JavaScript, no measuring.

    The wrapper must be the last child of `main`: a sticky element is released
    at the end of its own parent, and the layout's outer flex column ends below
    the footer.

    `pointer-events-none` on the rail and `auto` on the link, so an invisible
    full-width strip does not swallow clicks along the bottom of every page.
  -->
  <div
    v-if="feedbackFormUrl"
    class="pointer-events-none sticky bottom-0 z-30 h-0"
  >
    <a
      :href="feedbackFormUrl"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="t('feedback.aria')"
      class="pointer-events-auto absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] right-0 flex items-center gap-2 rounded-full border border-brand bg-brand px-3 py-2.5 text-sm font-semibold text-page shadow-lg transition hover:brightness-110 sm:px-4"
    >
      <svg
        class="h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        />
      </svg>
      <span>{{ t("feedback.label") }}</span>
    </a>
  </div>
</template>
<script setup lang="ts">
/**
 * Test-round feedback link (#263), pinned to the bottom of the viewport by the
 * sticky rail in the template rather than by `fixed` (#312).
 *
 * NOT in the footer, and that is the design decision rather than a detail:
 * /watchlist and /history append items on reaching the bottom (ScrollSentinel),
 * so the footer is effectively unreachable on the two pages testers spend the
 * most time in. Feedback is worth the most at the moment of frustration, and a
 * footer link is the one place frustration never reaches.
 *
 * #312 refined that without reversing it. The button no longer sits *on* the
 * footer either — a tester reported it covering the legal links on an iPhone,
 * which made #265's "reachable from the footer on every page" partly false. It
 * now yields at the end of `main`. On the two infinite-scrolling pages `main`
 * keeps growing, so nothing changes there; it only steps aside on pages that
 * have an end, which are the pages the footer was reachable on anyway.
 *
 * That is why the component is rendered as the last child of `main` in
 * layouts/default.vue and not beside it. A sticky element is released at the
 * end of its own parent, and the layout's outer flex column ends below the
 * footer — from there it would still cover it. Moving this call site breaks the
 * fix silently.
 *
 * The URL comes from runtimeConfig.public and the button renders only when it
 * is set — same reasoning as #264's Umami id: a value tied to one test round
 * does not belong in a committed file. Clearing the Render variable removes the
 * button without a deploy, so there is no follow-up ticket to remember once the
 * round ends and the form stops accepting answers.
 *
 * Unlike the Umami script, this one IS set in .env for development. A link
 * pollutes no dataset, and without it the v-if below is permanently false
 * locally, which means developing against a component that never renders.
 *
 * z-30 is deliberate. The overlay scale here is ConfirmDialog z-50,
 * DiscoverFilterDrawer z-[90], MediaDetailsModal z-[100], ToastContainer
 * z-[200]; anything higher would float this over an open dialog. A toast covers
 * it while it shows, which is transient and correct.
 */
const { t } = useI18n();
const { feedbackFormUrl } = useRuntimeConfig().public;
</script>

<!-- apps/web/app/components/layout/FeedbackButton.vue -->
<script setup lang="ts">
/**
 * Test-round feedback link, floating bottom-right (#263).
 *
 * NOT in the footer, and that is the design decision rather than a detail:
 * /watchlist and /history append items on reaching the bottom (ScrollSentinel),
 * so the footer is effectively unreachable on the two pages testers spend the
 * most time in. Feedback is worth the most at the moment of frustration, and a
 * footer link is the one place frustration never reaches.
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

<template>
  <a
    v-if="feedbackFormUrl"
    :href="feedbackFormUrl"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="t('feedback.aria')"
    class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-2.5 text-sm font-semibold text-primary shadow-lg backdrop-blur-md transition hover:brightness-125 sm:px-4"
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
</template>

<!-- apps/web/app/components/legal/LegalDocument.vue -->
<template>
  <article
    class="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8"
  >
    <h1 class="text-lg font-bold text-primary">{{ title }}</h1>

    <div class="flex flex-col gap-6 text-sm leading-relaxed text-secondary">
      <slot />
    </div>

    <NuxtLink
      :to="localePath('/')"
      class="text-sm font-semibold text-brand hover:underline"
    >
      {{ $t("nav.home") }}
    </NuxtLink>
  </article>
</template>
<script setup lang="ts">
/**
 * The shell for a legal page that has content, as opposed to LegalPlaceholder,
 * which is the shell for one that does not.
 *
 * Two components rather than a slot on the placeholder, for two reasons. A
 * component named Placeholder that renders a finished document has a name that
 * lies. And the layouts genuinely differ: the placeholder is a short centred
 * card, this is a column of prose that has to be read left to right.
 *
 * When /terms gets real content it switches to this one and the placeholder
 * disappears with the last page that needed it.
 */
defineProps<{ title: string }>();
const localePath = useLocalePath();
</script>

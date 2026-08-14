<!-- apps/web/app/components/ui/BrandLink.vue -->
<!-- The colour language of the primary call to action, in one place. It was
     declared identically in AccountPrompt and LandingPerks, and the header
     would have made three — three copies of one agreement is where they start
     to drift, because it only takes someone retouching the hover in one.

     Size and shadow stay with the caller: the header's version is a bar
     control and the page's is the destination of its section, and they
     shouldn't be the same size just because they're the same button. Vue
     merges a caller's `class` onto the root element, so no size prop is
     needed. -->
<template>
  <NuxtLink
    :to="to"
    class="whitespace-nowrap rounded-full bg-brand font-semibold text-page transition hover:brightness-110"
  >
    <slot />
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{ to: string }>();
</script>

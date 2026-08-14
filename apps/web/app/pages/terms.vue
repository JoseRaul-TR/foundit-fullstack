<!-- apps/web/app/pages/terms.vue -->
<!-- A real route rather than a dead link. The registration checkbox has to
     name what you're agreeing to, and a link that goes nowhere is worse than
     no link: it looks like the document exists and you failed to find it. -->
<template>
  <LegalPlaceholder :title="$t('legal.terms')" />
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth" });
</script>

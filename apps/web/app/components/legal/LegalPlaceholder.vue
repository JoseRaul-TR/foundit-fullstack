<!-- apps/web/app/components/legal/LegalPlaceholder.vue -->
<template>
  <div
    class="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center"
  >
    <h1 class="text-lg font-bold text-primary">{{ title }}</h1>
    <p class="text-sm text-secondary">{{ $t("legal.underConstruction") }}</p>
    <NuxtLink
      :to="localePath('/')"
      class="text-sm font-semibold text-brand hover:underline"
    >
      {{ $t("nav.home") }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
const localePath = useLocalePath();
</script>

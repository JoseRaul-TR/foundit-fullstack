<!-- apps/web/app/components/home/AccountPrompt.vue -->
<template>
  <div
    class="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center"
  >
    <p class="text-sm text-secondary">{{ $t("home.accountPrompt.title") }}</p>
    <BrandLink :to="localePath('/register')" class="px-6 py-2.5 text-sm">
      {{ $t("home.accountPrompt.cta") }}
    </BrandLink>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath();
</script>

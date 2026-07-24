<!-- apps/web/app/layouts/auth.vue -->
<template>
  <div
    class="flex min-h-screen items-center justify-center bg-page px-4 py-12 text-primary"
  >
    <div class="w-full max-w-sm">
      <div class="mb-8 flex justify-center">
        <NuxtLink to="/" class="text-2xl font-semibold text-brand">
          {{ appName }}
        </NuxtLink>
      </div>

      <div
        class="rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();
</script>

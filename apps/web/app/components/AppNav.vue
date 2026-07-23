<!-- apps/web/app/components/AppNav.vue -->
<template>
  <header class="border-b border-border bg-surface/80 backdrop-blur">
    <div
      class="mx-auto flex h-14 w-full max-w-container items-center px-4 sm:px-6 lg:px-8"
    >
      <NuxtLink to="/" class="text-lg font-semibold text-brand">
        {{ appName }}
      </NuxtLink>
      <!-- nav links, auth state, etc. -->
    </div>
  </header>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();
</script>

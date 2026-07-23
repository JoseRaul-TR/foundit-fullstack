<!-- apps/web/app/components/AppFooter.vue -->
<template>
  <footer class="border-t border-border bg-surface">
    <div
      class="mx-auto w-full max-w-container px-4 py-6 text-sm text-secondary sm:px-6 lg:px-8"
    >
      © {{ year }} {{ appName }}
    </div>
  </footer>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();
const year = new Date().getFullYear();
</script>

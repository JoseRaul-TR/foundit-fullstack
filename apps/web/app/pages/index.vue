<!-- apps/web/app/pages/index.vue -->
<template>
  <div>
    <h1>{{ appName }}</h1>
  </div>
</template>

<script setup lang="ts">
const { public: publicConfig } = useRuntimeConfig();
const appName = publicConfig.appName;
</script>

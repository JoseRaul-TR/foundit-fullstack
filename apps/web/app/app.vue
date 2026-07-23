<!-- apps/web/app/app.vue -->
<template>
  <div>
    <h1>{{ appName }}</h1>
  </div>
</template>

<script setup lang="ts">
import type { SupportedLocale } from "@foundit/types";

const { public: publicConfig } = useRuntimeConfig();
const appName = publicConfig.appName;

const demoLocale: SupportedLocale = "en";
void demoLocale;
</script>

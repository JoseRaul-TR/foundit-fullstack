<!-- apps/web/app/pages/index.vue -->
<template>
  <div>
    <h1>{{ appName }}</h1>
    <p>{{ t("home.tagline") }}</p>

    <!-- Temporary demo controls — confirms i18n switches reactively across en/es/sv -->
    <div style="display: flex; gap: 8px; margin-top: 12px">
      <button
        v-for="l in locales"
        :key="l.code"
        :disabled="l.code === locale"
        @click="setLocale(l.code)"
      >
        {{ l.code }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SupportedLocale } from "@foundit/types";

const { public: publicConfig } = useRuntimeConfig();
const appName = publicConfig.appName;

const demoLocale: SupportedLocale = "en";
void demoLocale;

const { t, locale, locales, setLocale } = useI18n();

const { tmdbLanguage } = useLocale();
console.log("[useLocale] tmdbLanguage:", tmdbLanguage.value);
</script>

<!-- apps/web/app/components/layout/LanguageMenu.vue -->
<!-- Width is set by whoever positions this: a flyout beside the avatar menu,
     an accordion inside it, or a panel above the footer selector all want
     different ones. -->
<template>
  <div
    class="rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
  >
    <button
      v-for="option in localeOptions"
      :key="option.code"
      type="button"
      class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-page"
      :class="
        option.code === locale
          ? 'font-bold text-brand'
          : 'font-medium text-primary'
      "
      @click="select(option.code)"
    >
      <span>{{ option.label }}</span>
      <span v-if="option.code === locale">✓</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { SupportedLocale } from "@foundit/types";

const { setLocale } = useI18n();
const { locale, localeOptions } = useLocale();

const emit = defineEmits<{ close: [] }>();

async function select(code: SupportedLocale) {
  await setLocale(code);
  emit("close");
}
</script>

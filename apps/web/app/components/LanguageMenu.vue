<!-- apps/web/app/components/LanguageMenu.vue -->
<template>
  <div
    class="w-40 rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
  >
    <button
      v-for="option in options"
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
const { locale, setLocale } = useI18n();

// Language names are conventionally shown in their own language,
// regardless of the currently active locale — not run through $t().
const options = [
  { code: "en" as const, label: "English" },
  { code: "es" as const, label: "Español" },
  { code: "sv" as const, label: "Svenska" },
];

const emit = defineEmits<{ close: [] }>();

async function select(code: "en" | "es" | "sv") {
  await setLocale(code);
  emit("close");
}
</script>

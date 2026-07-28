<template>
  <section class="border-t border-border py-5 first:border-t-0 first:pt-0">
    <button
      type="button"
      class="flex w-full items-center justify-between text-left"
      @click="isOpen = !isOpen"
    >
      <h3 class="text-base font-semibold text-primary">{{ title }}</h3>
      <svg
        class="h-[18px] w-[18px] shrink-0 text-secondary transition-transform"
        :class="{ 'rotate-180': isOpen }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    <div v-show="isOpen" class="mt-4">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{ title: string; defaultOpen?: boolean }>();

// import.meta.client es true solo en el bundle de cliente -- en SSR
// siempre cae al fallback `true`, y en cliente evalúa el ancho real
// ANTES del primer render (no en onMounted), evitando el flash de
// "expandido -> colapsado" en mobile.
const isOpen = ref(
  props.defaultOpen ?? (import.meta.client ? window.innerWidth >= 640 : true),
);
</script>

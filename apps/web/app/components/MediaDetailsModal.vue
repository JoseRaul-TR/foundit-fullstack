<!-- apps/web/app/components/MediaDetailsModal.vue -->
<!--
  Minimal shell for #72: overlay + back/close mechanics only. Real content
  (hero, cast, crew, recommendations) is a future MediaDetails ticket,
  built against Figma node 77:221 — that ticket only needs to fill in the
  placeholder below, the open/back/close plumbing is already done here.
-->
<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-page/80 px-4 py-8 backdrop-blur-sm sm:py-12"
      @click.self="close"
    >
      <div
        class="relative w-full max-w-3xl rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div
          class="flex items-center justify-between border-b border-border px-5 py-4"
        >
          <button
            v-if="canGoBack"
            type="button"
            class="flex items-center gap-1.5 text-sm font-medium text-secondary transition hover:text-primary"
            @click="back"
          >
            ← {{ $t("common.back") }}
          </button>
          <span v-else class="w-px" />

          <button
            type="button"
            class="text-secondary transition hover:text-primary"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="flex min-h-[320px] items-center justify-center p-8">
          <p class="text-sm text-secondary">{{ $t("common.loading") }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { isOpen, canGoBack, back, close } = useMediaModal();

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isOpen.value) close();
}

onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => document.removeEventListener("keydown", handleKeydown));
</script>

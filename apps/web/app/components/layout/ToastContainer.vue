<!-- apps/web/app/components/layout/ToastContainer.vue -->
<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg"
          :class="variantClasses[toast.variant]"
        >
          <span>{{ toast.message }}</span>
          <button
            type="button"
            class="shrink-0 opacity-70 hover:opacity-100"
            :aria-label="$t('common.close')"
            @click="toastStore.dismiss(toast.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const toastStore = useToastStore();

const variantClasses: Record<string, string> = {
  success: "border-success/40 bg-success/[0.12] text-success",
  error: "border-red-500/40 bg-red-500/[0.12] text-red-500",
  info: "border-border bg-surface text-primary",
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

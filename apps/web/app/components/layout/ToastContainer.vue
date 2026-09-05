<!-- apps/web/app/components/layout/ToastContainer.vue -->
<template>
  <Teleport to="body">
    <!--
      z-index: must sit above MediaDetailsModal (z-[100]). Both teleport to
      <body> as siblings, so they share a stacking context and the number
      decides. Toasts raised from inside the modal -- watchlist, watched,
      rating -- rendered behind it and were simply invisible.

      A toast is the topmost surface by design: it reports on what the user just
      did, wherever they did it, so nothing should ever cover it.

      Live region: this container is always in the DOM and only its children
      come and go. That ordering is what makes the announcement work -- a screen
      reader only announces changes inside a region it was already observing, so
      a region created at the same moment as its content stays silent.

      polite rather than assertive: these messages report a failed action, not
      an emergency. Assertive interrupts whatever is being read, which is
      warranted for something like a session timing out, not for "that didn't
      save".
    -->
    <div
      role="status"
      aria-live="polite"
      class="pointer-events-none fixed bottom-4 left-1/2 z-[200] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center justify-between gap-3 rounded-full border px-4 py-3 text-sm font-medium shadow-lg"
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
  success: "border-success bg-surface-elevated text-success",
  error: "border-error bg-surface-elevated text-error",
  info: "border-border bg-surface-elevated text-primary",
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

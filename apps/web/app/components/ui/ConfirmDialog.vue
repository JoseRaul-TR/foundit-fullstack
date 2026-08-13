<!-- apps/web/app/components/ui/ConfirmDialog.vue -->
<!-- The account deletion dialog, generalised. Removing a country deletes its
     services on the server too, and that ✕ now sits on the same pill people
     use to navigate — a destructive action reachable by a slip needs a
     question, and the app already had one written for a different slip.

     Escape closes and focus lands inside: it's a dialog, and the media modal
     already taught the app what that means. -->
<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="emit('close')"
    >
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        class="relative w-full max-w-md rounded-2xl border bg-surface p-7 text-center focus:outline-none"
        :class="danger ? 'border-error/30' : 'border-border'"
      >
        <button
          type="button"
          class="absolute right-4 top-4 text-secondary transition hover:text-primary"
          :aria-label="$t('common.cancel')"
          @click="emit('close')"
        >
          ✕
        </button>

        <div
          v-if="danger"
          class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-error/10 text-2xl"
          aria-hidden="true"
        >
          ⚠
        </div>

        <h2 class="mb-3 text-lg font-bold text-primary">{{ title }}</h2>
        <p class="mb-6 text-sm text-secondary">{{ description }}</p>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold text-primary transition hover:bg-surface-elevated"
            @click="emit('close')"
          >
            {{ cancelLabel ?? $t("common.cancel") }}
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition disabled:opacity-50"
            :class="
              danger
                ? 'bg-error text-white hover:brightness-110'
                : 'bg-brand text-page hover:brightness-110'
            "
            :disabled="pending"
            @click="emit('confirm')"
          >
            <Spinner v-if="pending" />
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
}>();

const emit = defineEmits<{ close: []; confirm: [] }>();

const panelRef = ref<HTMLElement | null>(null);

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  void nextTick(() => panelRef.value?.focus());
});
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

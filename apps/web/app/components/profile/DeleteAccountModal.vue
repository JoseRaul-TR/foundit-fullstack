<!-- apps/web/app/components/profile/DeleteAccountModal.vue -->
<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center"
      >
        <button
          type="button"
          class="absolute right-4 top-4 text-secondary hover:text-primary"
          :aria-label="$t('profile.deleteConfirm.cancel')"
          @click="emit('close')"
        >
          ✕
        </button>

        <div
          class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-2xl"
        >
          ⚠
        </div>

        <h2 class="mb-3 text-lg font-bold text-primary">
          {{ $t("profile.deleteConfirm.title") }}
        </h2>
        <p class="mb-6 text-sm text-secondary">
          {{ $t("profile.deleteConfirm.description") }}
        </p>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-primary hover:bg-surface-elevated"
            @click="emit('close')"
          >
            {{ $t("profile.deleteConfirm.cancel") }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            :disabled="deleting"
            @click="emit('confirm')"
          >
            {{ $t("profile.deleteConfirm.confirm") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ deleting?: boolean }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

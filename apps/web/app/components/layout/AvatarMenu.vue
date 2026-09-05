<!-- apps/web/app/components/layout/AvatarMenu.vue -->
<template>
  <div
    class="z-50 w-56 rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
  >
    <div class="flex items-center gap-2.5 px-3 py-2.5">
      <UserAvatar
        :src="authStore.user?.avatarUrl"
        :name="authStore.user?.name"
        :email="authStore.user?.email"
        class="h-9 w-9 text-[13px]"
      />
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="truncate text-sm font-bold text-primary">
          {{ authStore.user?.name }}
        </span>
        <span class="truncate text-xs text-secondary">
          {{ authStore.user?.email }}
        </span>
      </div>
    </div>

    <div class="my-1 h-px bg-border" />

    <NuxtLink
      :to="localePath('/profile')"
      class="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-page"
      @click="$emit('close')"
    >
      {{ $t("nav.settings") }}
    </NuxtLink>

    <div ref="languageWrapperRef" class="relative">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-page"
        :aria-expanded="languageMenuOpen"
        @click="languageMenuOpen = !languageMenuOpen"
      >
        <span>{{ $t("common.language") }}</span>
        <span class="flex items-center gap-1 text-secondary">
          <span class="text-xs">{{ localeLabel(locale) }}</span>
          <!-- Points down while the panel is an accordion, right once it
               becomes a flyout, so the arrow always says where it will open. -->
          <span
            class="inline-block transition-transform"
            :class="languageMenuOpen ? 'rotate-90 sm:rotate-0' : ''"
            aria-hidden="true"
            >›</span
          >
        </span>
      </button>

      <!-- Below the row on phones, to the side from `sm`. The flyout needs
           224px of menu plus 160 of panel plus the gap — 392 in total, on a
           375px screen. It didn't overflow gracefully, it left the viewport. -->
      <LanguageMenu
        v-if="languageMenuOpen"
        class="mt-1 w-full sm:absolute sm:right-full sm:top-0 sm:z-50 sm:mr-2 sm:mt-0 sm:w-40"
        @close="languageMenuOpen = false"
      />
    </div>

    <div class="my-1 h-px bg-border" />

    <button
      type="button"
      class="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-secondary hover:bg-page"
      @click="handleLogout"
    >
      {{ $t("nav.logout") }}
    </button>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
const { locale, localeLabel } = useLocale();
const localePath = useLocalePath();
const { signOut } = useAuth();

const emit = defineEmits<{ close: [] }>();

const languageMenuOpen = ref(false);
const languageWrapperRef = ref<HTMLElement | null>(null);

useClickOutside(languageWrapperRef, () => {
  languageMenuOpen.value = false;
});

async function handleLogout() {
  emit("close");
  await signOut();
}
</script>

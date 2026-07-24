<!-- apps/web/app/components/AvatarMenu.vue -->
<template>
  <div
    class="z-50 w-56 rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
  >
    <div class="flex items-center gap-2.5 px-3 py-2.5">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-bold text-page"
      >
        {{ initials }}
      </span>
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
      to="/profile"
      class="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-page"
      @click="$emit('close')"
    >
      {{ $t("nav.settings") }}
    </NuxtLink>

    <div ref="languageWrapperRef" class="relative">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-page"
        @click="languageMenuOpen = !languageMenuOpen"
      >
        <span>{{ $t("common.language") }}</span>
        <span class="flex items-center gap-1 text-secondary">
          <span class="text-xs uppercase">{{ locale }}</span>
          <span>›</span>
        </span>
      </button>

      <LanguageMenu
        v-if="languageMenuOpen"
        class="absolute right-full top-0 z-50 mr-2"
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
const { locale } = useLocale();
const { signOut } = useAuth();

const emit = defineEmits<{ close: [] }>();

const languageMenuOpen = ref(false);
const languageWrapperRef = ref<HTMLElement | null>(null);

useClickOutside(languageWrapperRef, () => {
  languageMenuOpen.value = false;
});

const initials = computed(() => {
  const name = authStore.user?.name;
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
});

async function handleLogout() {
  emit("close");
  await signOut();
}
</script>

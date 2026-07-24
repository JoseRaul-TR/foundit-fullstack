<!-- apps/web/app/components/AppNav.vue -->
<template>
  <header
    class="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-3.5"
  >
    <nav
      class="flex items-center gap-1.5 rounded-full bg-surface py-1.5 pl-1.5 pr-2 shadow-[0_4px_4px_rgba(0,0,0,0.25)] sm:gap-6 sm:py-2 sm:pl-2 sm:pr-3"
    >
      <NuxtLink
        to="/"
        class="glass flex items-center gap-1.5 rounded-full bg-page/20 px-2 py-1.5 transition hover:brightness-125 sm:gap-2.5 sm:px-3 sm:py-2"
        :class="
          authStore.isAuthenticated && isHomeActive
            ? 'shadow-[0_0_15px_-5px_#e8a33d]'
            : ''
        "
      >
        <span
          class="h-6 w-6 shrink-0 rounded-lg bg-[linear-gradient(45deg,_#e8a33d_14.286%,_#c9791f_85.714%)] sm:h-7 sm:w-7"
        />
        <span
          class="hidden whitespace-nowrap text-lg font-bold text-primary sm:inline sm:text-xl"
        >
          {{ appName }}
        </span>
      </NuxtLink>

      <template v-if="authStore.isAuthenticated">
        <NuxtLink
          to="/watchlist"
          class="whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-medium transition sm:px-4 sm:py-2 sm:text-sm"
          :class="
            isWatchlistActive
              ? 'glass bg-page/20 text-primary shadow-[0_0_15px_-5px_#e8a33d]'
              : 'text-secondary hover:bg-page/10 hover:text-primary'
          "
        >
          {{ $t("nav.watchlist") }}
        </NuxtLink>
        <NuxtLink
          to="/history"
          class="whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-medium transition sm:px-4 sm:py-2 sm:text-sm"
          :class="
            isHistoryActive
              ? 'glass bg-page/20 text-primary shadow-[0_0_15px_-5px_#e8a33d]'
              : 'text-secondary hover:bg-page/10 hover:text-primary'
          "
        >
          {{ $t("nav.history") }}
        </NuxtLink>
      </template>
    </nav>

    <div
      v-if="authStore.isAuthenticated"
      ref="avatarWrapperRef"
      class="relative"
    >
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-page transition hover:brightness-110 sm:h-[34px] sm:w-[34px] sm:text-[13px]"
        @click="avatarMenuOpen = !avatarMenuOpen"
      >
        {{ initials }}
      </button>

      <AvatarMenu
        v-if="avatarMenuOpen"
        class="absolute right-0 top-full mt-2"
        @close="avatarMenuOpen = false"
      />
    </div>

    <div v-else class="flex items-center gap-3 sm:gap-[18px]">
      <NuxtLink
        to="/login"
        class="whitespace-nowrap text-xs font-medium text-secondary transition-colors hover:text-primary sm:text-sm"
      >
        {{ $t("nav.login") }}
      </NuxtLink>
      <NuxtLink
        to="/register"
        class="glass whitespace-nowrap rounded-full bg-brand/32 px-3.5 py-2 text-xs font-bold text-brand transition hover:brightness-110 sm:px-5 sm:py-2.5 sm:text-[13px]"
      >
        {{ $t("nav.register") }}
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();

const authStore = useAuthStore();
const route = useRoute();

const avatarMenuOpen = ref(false);
const avatarWrapperRef = ref<HTMLElement | null>(null);

useClickOutside(avatarWrapperRef, () => {
  avatarMenuOpen.value = false;
});

const routeBaseName = computed(() => route.name?.toString().split("___")[0]);

const isHomeActive = computed(() => routeBaseName.value === "index");
const isWatchlistActive = computed(
  () => authStore.isAuthenticated && routeBaseName.value === "watchlist",
);
const isHistoryActive = computed(
  () => authStore.isAuthenticated && routeBaseName.value === "history",
);

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
</script>

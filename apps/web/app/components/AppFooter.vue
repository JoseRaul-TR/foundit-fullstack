<!-- apps/web/app/components/AppFooter.vue -->
<template>
  <footer class="border-t border-border bg-surface">
    <div
      class="mx-auto flex w-full max-w-container flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8"
    >
      <div
        class="flex flex-col items-center gap-1 text-center lg:flex-1 lg:items-start lg:text-left"
      >
        <NuxtLink
          to="/"
          class="flex items-center gap-2 rounded-lg transition hover:brightness-125"
        >
          <span
            class="h-6 w-6 shrink-0 rounded-md bg-[linear-gradient(45deg,_#e8a33d_14.286%,_#c9791f_85.714%)]"
          />
          <span class="text-base font-bold text-primary">{{ appName }}</span>
        </NuxtLink>
        <p class="max-w-xs text-xs text-secondary sm:max-w-sm">
          {{ $t("home.tagline") }}
        </p>
      </div>

      <div
        class="flex flex-wrap items-center justify-center gap-4 lg:justify-end"
      >
        <a
          href="https://github.com/JoseRaul-TR/foundit-fullstack"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-medium text-secondary transition-colors hover:text-primary"
        >
          {{ $t("footer.github") }}
        </a>
        <NuxtLink
          to="/about"
          class="text-sm font-medium text-secondary transition-colors hover:text-primary"
        >
          {{ $t("footer.about") }}
        </NuxtLink>

        <div ref="languageWrapperRef" class="relative">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-2 text-[13px] font-medium text-primary transition hover:border-primary/40 hover:bg-page/40"
            @click="languageMenuOpen = !languageMenuOpen"
          >
            <span class="uppercase">{{ locale }}</span>
            <span class="text-secondary">⌄</span>
          </button>

          <LanguageMenu
            v-if="languageMenuOpen"
            class="absolute bottom-full right-0 z-50 mb-2"
            @close="languageMenuOpen = false"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-border">
      <div
        class="mx-auto w-full max-w-container px-4 py-4 text-center text-xs text-secondary sm:px-6 lg:px-8 lg:text-left"
      >
        {{ $t("footer.copyright", { year }) }}
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();
const { locale } = useLocale();

const year = new Date().getFullYear();

const languageMenuOpen = ref(false);
const languageWrapperRef = ref<HTMLElement | null>(null);

useClickOutside(languageWrapperRef, () => {
  languageMenuOpen.value = false;
});
</script>

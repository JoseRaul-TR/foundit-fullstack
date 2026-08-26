<!-- apps/web/app/components/layout/AppFooter.vue -->
<!-- Figma 273:351, with three departures.
     - The language is named in full on mobile too. The wireframe shrinks it
       to "EN", which is the one place a two-letter code helps nobody: whoever
       needs the selector is the person who can't read the current language.
     - No drop shadow. The wireframe gives the footer `0 4px 4px`, pointing
       down, from the lowest element on the page — it falls outside the
       viewport and nobody ever sees it.
     - One copyright string, not the wireframe's shortened mobile variant.
       That would mean a second key in three languages to save four words that
       wrap onto a second line and cost nothing.
     - Two legal links beside the copyright, which the wireframe does not have.
       /privacy stopped being a placeholder in #265 and the registration form
       was the only way to reach either page. A notice reachable from one form
       is not reachable. -->
<template>
  <footer class="border-t border-border bg-surface">
    <div
      class="mx-auto flex w-full max-w-container flex-col items-center gap-4 px-6 py-6 lg:items-stretch lg:px-8"
    >
      <div
        class="flex w-full flex-col items-center gap-4 text-center lg:flex-row lg:gap-6 lg:text-left"
      >
        <div class="flex flex-col items-center gap-1 lg:items-start">
          <NuxtLink
            :to="localePath('/')"
            class="flex items-center gap-2 rounded-lg transition hover:brightness-125"
          >
            <span
              class="h-[22px] w-[22px] shrink-0 rounded-md bg-[linear-gradient(45deg,_#e8a33d_14.286%,_#c9791f_85.714%)] lg:h-6 lg:w-6 lg:rounded-lg"
            />
            <span class="text-[15px] font-bold text-primary lg:text-base">
              {{ appName }}
            </span>
          </NuxtLink>
          <p
            class="max-w-[280px] text-xs text-secondary lg:max-w-[320px] lg:text-[13px]"
          >
            {{ $t("home.tagline") }}
          </p>
        </div>

        <div class="hidden lg:block lg:flex-1" />

        <div class="flex flex-wrap items-center justify-center gap-4 lg:gap-6">
          <NuxtLink
            :to="localePath('/about')"
            class="py-2 text-[13px] font-medium text-secondary transition-colors hover:text-primary lg:text-sm"
          >
            {{ $t("footer.about") }}
          </NuxtLink>
          <a
            href="https://github.com/JoseRaul-TR/foundit-fullstack"
            target="_blank"
            rel="noopener noreferrer"
            class="py-2 text-[13px] font-medium text-secondary transition-colors hover:text-primary lg:text-sm"
          >
            {{ $t("footer.github") }}
          </a>

          <div ref="languageWrapperRef" class="relative">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated py-2 pl-3 pr-2.5 text-[13px] font-medium text-primary transition hover:border-primary/40 hover:bg-page/40"
              :aria-expanded="languageMenuOpen"
              :aria-label="`${$t('common.language')}: ${localeLabel(locale)}`"
              @click="languageMenuOpen = !languageMenuOpen"
            >
              <span>{{ localeLabel(locale) }}</span>
              <span
                class="inline-block text-xs font-bold leading-none text-secondary transition-transform"
                :class="languageMenuOpen ? 'rotate-180' : ''"
                aria-hidden="true"
                >⌄</span
              >
            </button>

            <!-- Upwards: this is the bottom of the page, and there is nothing
                 below it to open into. -->
            <LanguageMenu
              v-if="languageMenuOpen"
              class="absolute bottom-full right-0 z-50 mb-2 w-40"
              @close="languageMenuOpen = false"
            />
          </div>
        </div>
      </div>

      <div class="h-px w-full bg-border" />
      <div
        class="flex w-full flex-col items-center gap-2 text-[11px] text-secondary lg:flex-row lg:justify-between lg:text-xs"
      >
        <p>{{ $t("footer.copyright", { year }) }}</p>
        <!-- Privacy before Terms: it is the one that says something, and the
             one a tester in #249's round has a reason to open. -->
        <div class="flex items-center gap-4">
          <NuxtLink
            :to="localePath('/privacy')"
            class="py-1 font-medium transition-colors hover:text-primary"
          >
            {{ $t("legal.privacy") }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/terms')"
            class="py-1 font-medium transition-colors hover:text-primary"
          >
            {{ $t("legal.terms") }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();
const { locale, localeLabel } = useLocale();
const localePath = useLocalePath();

const year = new Date().getFullYear();

const languageMenuOpen = ref(false);
const languageWrapperRef = ref<HTMLElement | null>(null);

useClickOutside(languageWrapperRef, () => {
  languageMenuOpen.value = false;
});
</script>

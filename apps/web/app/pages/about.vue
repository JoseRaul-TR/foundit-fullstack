<!-- apps/web/app/pages/about.vue -->
<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-8 py-10">
    <div class="flex items-center gap-2">
      <span
        class="h-8 w-8 shrink-0 rounded-lg bg-[linear-gradient(45deg,_#e8a33d_14.286%,_#c9791f_85.714%)]"
      />
      <span class="text-2xl font-bold text-primary">{{ appName }}</span>
    </div>

    <h1 class="text-xl font-bold text-primary">{{ $t("about.title") }}</h1>

    <section
      class="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
    >
      <h2 class="text-base font-bold text-primary">
        {{ $t("about.dataSource.title") }}
      </h2>

      <!-- Logo deliberately smaller/less prominent than FoundIt's own
           branding above (h-8 vs h-5), per TMDB's terms of use. -->
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        class="w-fit text-sm font-medium text-accent align-center justify-center"
      >
        <img
          src="/tmdb-logo.svg"
          alt="The Movie Database (TMDB)"
          class="h-5 w-auto"
          loading="lazy"
        />
      </a>

      <!-- Required notice, kept in English exactly as specified by
           TMDB's terms — not run through i18n, since this is a fixed
           legal notice, not app copy. -->
      <p class="text-sm leading-relaxed text-secondary">
        {{ $t("about.text") }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();
</script>

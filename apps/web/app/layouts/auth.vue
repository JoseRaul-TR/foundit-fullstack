<!-- apps/web/app/layouts/auth.vue -->
<!-- Its own layout still: a sign-in screen with the full navigation offers
     three ways to leave and one to continue. But it stops being a page with
     no way out — the mark links home — and it keeps the footer, because the
     language selector lives there and this is the one place with no avatar
     menu to reach it from. Someone who lands here in a language they don't
     read would otherwise be stuck. -->
<template>
  <div class="flex min-h-screen flex-col bg-page text-primary">
    <main class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex justify-center">
          <NuxtLink
            :to="localePath('/')"
            class="flex items-center gap-2 rounded-lg transition hover:brightness-125"
          >
            <span
              class="h-7 w-7 shrink-0 rounded-lg bg-[linear-gradient(45deg,_#e8a33d_14.286%,_#c9791f_85.714%)]"
            />
            <span class="text-xl font-bold text-primary">{{ appName }}</span>
          </NuxtLink>
        </div>

        <slot />
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();
const localePath = useLocalePath();
</script>

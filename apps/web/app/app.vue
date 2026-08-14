<!-- apps/web/app/app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!--
    Both of these teleport to <body> and are global singletons, so they live
    here rather than inside a layout.

    Their order matters: NuxtLayout is loaded asynchronously, so anything
    teleporting from inside it lands in <body> at a different point on the
    client than on the server. ToastContainer used to sit in the layouts and
    that's exactly what happened — the server emitted [toast][modal] and the
    client hydrated [modal][toast], producing mismatches in both components.
    As synchronous siblings here, their relative order is identical on both
    sides.
  -->
  <MediaDetailsModal />
  <ToastContainer />
</template>
<script setup lang="ts">
// The one thing the <html> element has to say that Nuxt doesn't say for us.
// Without it a screen reader falls back to the reader's own language and
// pronounces Swedish with Spanish phonemes — and the app has three locales,
// so it's wrong for two thirds of its users by construction.
const { locale } = useI18n();
useHead({ htmlAttrs: { lang: locale } });
</script>

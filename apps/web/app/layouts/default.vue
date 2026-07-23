<!-- apps/web/app/layout/default.vue -->
<template>
  <div class="flex min-h-screen flex-col bg-page text-primary">
    <AppNav class="sticky top-0 z-40" />

    <main
      class="mx-auto w-full max-w-container flex-1 px-4 py-6 sm:px-6 lg:px-8"
    >
      <slot />
    </main>

    <AppFooter />
  </div>
</template>

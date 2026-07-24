<!-- apps/web/app/layouts/default.vue -->
<template>
  <div class="flex min-h-screen flex-col bg-page text-primary">
    <AppNav />

    <main
      class="mx-auto w-full max-w-container flex-1 px-4 pb-6 pt-20 sm:px-6 sm:pt-24 lg:px-8"
    >
      <slot />
    </main>

    <AppFooter />
  </div>
</template>

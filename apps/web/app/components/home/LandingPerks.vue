<!-- apps/webb/app/components/home/LandingPerks.vue -->
<template>
  <section class="mx-auto mt-16 w-full max-w-4xl px-4">
    <h2 class="text-center text-lg font-semibold text-primary">
      {{ $t("home.perks.title") }}
    </h2>
    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        v-for="key in perkKeys"
        :key="key"
        class="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
      >
        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
        <div>
          <p class="text-sm font-semibold text-primary">
            {{ $t(`home.perks.items.${key}.title`) }}
          </p>
          <p class="text-xs text-secondary">
            {{ $t(`home.perks.items.${key}.description`) }}
          </p>
        </div>
      </div>
    </div>
    <div class="mt-6 flex justify-center">
      <NuxtLink
        :to="localePath('/register')"
        class="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-page transition hover:brightness-110"
      >
        {{ $t("home.perks.cta") }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
const perkKeys = [
  "discover",
  "watchlist",
  "history",
  "filterPlatform",
] as const;
const localePath = useLocalePath();
</script>

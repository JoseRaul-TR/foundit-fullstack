<!-- apps/web/app/components/media/ProviderBadge.vue -->
<template>
  <span
    class="flex h-9 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px]"
    :class="
      subscribed
        ? 'border-[1.5px] border-success bg-success/[0.14] text-success'
        : 'bg-surface-elevated text-primary'
    "
  >
    <img
      v-if="logoUrl"
      :src="logoUrl"
      :alt="name"
      class="h-[26px] w-[26px] rounded-[5px]"
    />
    <span
      v-else
      class="h-[26px] w-[26px] rounded-[5px]"
      :class="subscribed ? 'bg-success/25' : 'bg-white/10'"
    />
    {{ name }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  logoPath: string;
  subscribed?: boolean;
}>();

const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/original";
const logoUrl = computed(() =>
  props.logoPath ? `${TMDB_LOGO_BASE}${props.logoPath}` : null,
);
</script>

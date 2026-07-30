<!-- apps/web/app/components/media/ProviderBadge.vue -->
<template>
  <component
    :is="href ? 'a' : 'span'"
    :href="href ?? undefined"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noopener noreferrer' : undefined"
    class="flex h-9 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px]"
    :class="
      subscribed
        ? 'border-[1.5px] border-success bg-success/[0.14] text-success'
        : 'bg-surface-elevated text-primary'
    "
    :aria-label="ariaLabel"
  >
    <img
      v-if="logoUrl && !imgFailed"
      :src="logoUrl"
      :alt="name"
      class="h-[26px] w-[26px] rounded-[5px]"
      @error="handleImgError"
    />
    <span
      v-else
      class="h-[26px] w-[26px] rounded-[5px]"
      :class="subscribed ? 'bg-success/25' : 'bg-white/10'"
    />
    {{ name }}
  </component>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  logoPath: string;
  subscribed?: boolean;
  /** TMDB's per-country watch link for this title. Non-clickable when absent. */
  href?: string | null;
}>();

const { t } = useI18n();

const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/original";
const logoUrl = computed(() =>
  props.logoPath ? `${TMDB_LOGO_BASE}${props.logoPath}` : null,
);

// Covers both cases: no logoPath at all (logoUrl null, handled by v-else
// above already) AND a valid path that fails to actually load at runtime
// (404, network error, TMDB CDN hiccup) — imgFailed catches the latter.
const imgFailed = ref(false);
function handleImgError() {
  imgFailed.value = true;
}

const ariaLabel = computed(() =>
  props.subscribed
    ? t("mediaDetail.providerSubscribed", { name: props.name })
    : t("mediaDetail.providerNotSubscribed", { name: props.name }),
);
</script>

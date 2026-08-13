<!-- apps/web/app/components/media/ProviderBadge.vue -->
<!-- No longer a link. TMDB exposes one watch URL per country and title, not
     one per provider, so every badge in a country pointed at the same page —
     eight pills each promising to take you to a different platform and all
     eight arriving at the same list. The link moved to the foot of the
     country panel, where one link that says "view the options" is true. -->
<template>
  <span
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
      loading="lazy"
      @error="handleImgError"
    />
    <span
      v-else
      class="h-[26px] w-[26px] rounded-[5px]"
      :class="subscribed ? 'bg-success/25' : 'bg-white/10'"
    />
    {{ name }}
    <!-- A word, not a coloured dot. A dot only means something next to a
         legend, and there won't be one; it would also say nothing at all to
         someone who can't tell the colours apart or who never hovers. The
         full sentence lives in the aria-label, which is where it has to be. -->
    <span
      v-if="withAds"
      class="text-[10px] font-medium uppercase tracking-wide text-secondary"
      aria-hidden="true"
    >
      {{ $t("mediaDetail.withAds") }}
    </span>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  logoPath: string;
  subscribed?: boolean;
  withAds?: boolean;
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

const ariaLabel = computed(() => {
  const base = props.subscribed
    ? t("mediaDetail.providerSubscribed", { name: props.name })
    : t("mediaDetail.providerNotSubscribed", { name: props.name });
  return props.withAds ? `${base}, ${t("mediaDetail.withAds")}` : base;
});
</script>

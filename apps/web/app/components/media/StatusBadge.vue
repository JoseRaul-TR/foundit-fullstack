<!-- apps/web/app/components/media/StatusBadge.vue -->
<!--
  Figma solo diseñó explícitamente "Ended" (neutral) y "Ongoing/Returning"
  (dorado) en el nodo de referencia 158:418. "canceled" y "upcoming" son
  extrapolación mía sin confirmación visual -- avísame si no encajan.
-->
<template>
  <span
    class="whitespace-nowrap rounded-full px-3 py-[5px] text-xs font-medium"
    :class="classesByStatus[status]"
  >
    {{ $t(`mediaDetail.seriesStatus.${status}`) }}
  </span>
</template>

<script setup lang="ts">
import type { SeriesStatus } from "@foundit/types";

defineProps<{ status: SeriesStatus }>();

const classesByStatus: Record<SeriesStatus, string> = {
  returning: "bg-brand/[0.16] text-brand",
  ended: "bg-white/[0.08] text-secondary",
  canceled: "bg-error/[0.14] text-error",
  upcoming: "bg-accent/[0.16] text-accent",
};
</script>

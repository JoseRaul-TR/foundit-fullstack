<!-- apps/web/app/components/profile/ServiceSelector.vue -->
<template>
  <div class="flex flex-col gap-1.5">
    <div
      v-for="provider in providers"
      :key="provider.providerId"
      class="flex items-center justify-between gap-3 rounded-xl bg-surface-elevated px-3 py-2.5"
    >
      <div class="flex items-center gap-2.5">
        <img
          v-if="logoUrl(provider) && !failedLogos.has(provider.providerId)"
          :src="logoUrl(provider)!"
          :alt="provider.name"
          class="h-8 w-8 rounded-md object-cover"
          @error="failedLogos.add(provider.providerId)"
        />
        <span v-else class="h-8 w-8 rounded-md bg-white/10" />
        <span class="text-sm text-primary">{{ provider.name }}</span>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="isSubscribed(provider.providerId)"
        :aria-label="provider.name"
        :disabled="isPending(provider.providerId)"
        class="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50"
        :class="isSubscribed(provider.providerId) ? 'bg-brand' : 'bg-white/15'"
        @click="toggle(provider.providerId)"
      >
        <span
          class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          :class="
            isSubscribed(provider.providerId)
              ? 'translate-x-[22px]'
              : 'translate-x-0.5'
          "
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProviderItem } from "@foundit/types";
import { useToast } from "~/composables/useToast";

const props = defineProps<{
  countryCode: string;
  providers: ProviderItem[];
  subscribedIds: number[];
}>();

const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";
function logoUrl(provider: ProviderItem): string | null {
  return provider.logoPath ? `${TMDB_LOGO_BASE}${provider.logoPath}` : null;
}

const failedLogos = reactive(new Set<number>());

const localSubscribed = ref(new Set(props.subscribedIds));
watch(
  () => props.subscribedIds,
  (ids) => {
    localSubscribed.value = new Set(ids);
  },
);

function isSubscribed(providerId: number): boolean {
  return localSubscribed.value.has(providerId);
}

const pendingIds = reactive(new Set<number>());
function isPending(providerId: number): boolean {
  return pendingIds.has(providerId);
}

const { mutateAsync: addService } = useAddServiceMutation();
const { mutateAsync: removeService } = useRemoveServiceMutation();

async function toggle(providerId: number) {
  if (isPending(providerId)) return;
  const wasSubscribed = isSubscribed(providerId);

  pendingIds.add(providerId);
  const optimistic = new Set(localSubscribed.value);
  if (wasSubscribed) {
    optimistic.delete(providerId);
  } else {
    optimistic.add(providerId);
  }
  localSubscribed.value = optimistic;

  try {
    if (wasSubscribed) {
      await removeService({ providerId, countryCode: props.countryCode });
    } else {
      await addService({ providerId, countryCode: props.countryCode });
    }
  } catch {
    const rollback = new Set(localSubscribed.value);
    if (wasSubscribed) {
      rollback.add(providerId);
    } else {
      rollback.delete(providerId);
    }
    localSubscribed.value = rollback;
    useToast().error(useI18n().t("errors.generic"));
  } finally {
    pendingIds.delete(providerId);
  }
}
</script>

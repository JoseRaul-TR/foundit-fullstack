<!-- apps/web/app/components/profile/ServiceSelector.vue -->
<!-- Figma 235:38. Rows are pills like everything else in the app, 56px tall
     with 8px between them, and the switch is 40×22 with an 18px thumb that
     travels exactly its own width. It used to be 24×44 with a 22px throw and
     no `left`, so where the thumb started depended on layout rather than being
     stated — which is why it sat wrong. -->
<template>
  <div
    class="flex max-h-[312px] flex-col gap-2 overflow-y-auto overscroll-contain px-1 py-1"
  >
    <div
      v-for="provider in providers"
      :key="provider.providerId"
      class="flex h-14 shrink-0 items-center justify-between gap-3 rounded-full px-4 transition"
      :class="
        isSubscribed(provider.providerId)
          ? 'bg-success/[0.08] ring-1 ring-success'
          : 'bg-surface-elevated'
      "
    >
      <div class="flex min-w-0 items-center gap-3">
        <!-- Not a circle: these are wordmarks, and cropping HBO Max into a
             round hole eats the mark it exists to show. -->
        <img
          v-if="logoUrl(provider) && !failedLogos.has(provider.providerId)"
          :src="logoUrl(provider)!"
          :alt="provider.name"
          class="h-8 w-8 shrink-0 rounded-lg object-cover"
          loading="lazy"
          @error="failedLogos.add(provider.providerId)"
        />
        <span v-else class="h-8 w-8 shrink-0 rounded-lg bg-white/10" />
        <span
          class="truncate text-sm font-medium"
          :class="
            isSubscribed(provider.providerId) ? 'text-success' : 'text-primary'
          "
        >
          {{ provider.name }}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        :aria-checked="isSubscribed(provider.providerId)"
        :aria-label="provider.name"
        :disabled="isPending(provider.providerId)"
        class="relative h-[22px] w-10 shrink-0 rounded-full transition-colors disabled:opacity-50"
        :class="
          isSubscribed(provider.providerId) ? 'bg-success' : 'bg-white/15'
        "
        @click="toggle(provider.providerId)"
      >
        <span
          class="absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform motion-reduce:transition-none"
          :class="
            isSubscribed(provider.providerId)
              ? 'translate-x-[18px]'
              : 'translate-x-0'
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

const toast = useToast();
const { t } = useI18n();

function logoUrl(provider: ProviderItem): string | null {
  return tmdbImage(provider.logoPath, 92);
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
  } catch (error) {
    // The rollback runs whatever the cause -- including a 401, where the switch
    // would otherwise stay showing a subscription the server never recorded.
    // Only the toast is suppressed there, because apiFetch has already sent the
    // user to the login page.
    const rollback = new Set(localSubscribed.value);
    if (wasSubscribed) {
      rollback.add(providerId);
    } else {
      rollback.delete(providerId);
    }
    localSubscribed.value = rollback;

    if (isUnauthorized(error)) return;

    toast.error(
      t(
        wasSubscribed
          ? "feedback.provider.removeError"
          : "feedback.provider.addError",
      ),
    );
  } finally {
    pendingIds.delete(providerId);
  }
}
</script>

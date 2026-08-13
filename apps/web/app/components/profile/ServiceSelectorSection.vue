<!-- apps/web/app/components/profile/ServiceSelectorSection.vue -->
<!-- Loads the provider catalog for one country and feeds ServiceSelector
     — kept separate so ServiceSelector itself stays purely prop-driven,
     matching #84's contract. -->
<template>
  <div
    v-if="providersQuery.isPending.value"
    class="flex max-h-[312px] flex-col gap-2 overflow-hidden pr-1"
  >
    <div
      v-for="n in 5"
      :key="n"
      class="h-14 shrink-0 animate-pulse rounded-full bg-surface-elevated"
    />
  </div>
  <ServiceSelector
    v-else
    :country-code="countryCode"
    :providers="providersQuery.data.value ?? []"
    :subscribed-ids="subscribedIds"
  />
</template>

<script setup lang="ts">
import ServiceSelector from "./ServiceSelector.vue";

const props = defineProps<{ countryCode: string }>();

const countryCodeRef = computed(() => props.countryCode);
const providersQuery = useProvidersQuery(countryCodeRef);

const profileStore = useProfileStore();
const subscribedIds = computed(() =>
  (profileStore.subscribedServices[props.countryCode] ?? []).map(
    (s) => s.providerId,
  ),
);
</script>

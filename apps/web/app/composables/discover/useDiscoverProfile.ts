// apps/web/app/composables/discover/useDiscoverProfile.ts
//
// Thin wrapper kept for call-site stability in DiscoverPanel.vue —
// delegates to the canonical useProfileQuery() (composables/profile/
// useProfile.ts), which already syncs profileStore. Previously did its
// own useAsyncData fetch; consolidated now that Profile page needs the
// same data via TanStack Query.
export function useDiscoverProfile() {
  const query = useProfileQuery();
  return { pending: query.isPending, data: query.data };
}

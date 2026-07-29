// apps/web/app/composables/auth/useAuth.ts
//
// Thin wrapper around Better Auth's sign-out endpoint, mirroring the raw
// $fetch style already used in plugins/auth.ts (not routed through
// useApi()/apiFetch — that composable's 401-redirect behavior doesn't
// apply here, and would be redundant since we redirect manually anyway).
import { useQueryClient } from "@tanstack/vue-query";

export function useAuth() {
  const { public: publicConfig } = useRuntimeConfig();
  const authStore = useAuthStore();
  const queryClient = useQueryClient();
  const localePath = useLocalePath();

  async function signOut() {
    try {
      await $fetch("/api/v1/auth/sign-out", {
        method: "POST",
        baseURL: publicConfig.apiBase,
        credentials: "include",
      });
    } finally {
      // Clear local state regardless of request outcome — an
      // unreachable auth service shouldn't trap the user in a
      // "logged in" UI they can no longer act on.
      authStore.clearUser();
      // Without this, cached queries (profile, discover, etc.) from this
      // session stay in the in-memory QueryClient and leak into whichever
      // account signs in next in the same browser tab — the QueryClient
      // is a singleton that only resets on a hard page reload, not on
      // logout. Same reasoning applies to account deletion below.
      queryClient.clear();
      await navigateTo(localePath("/"));
    }
  }

  return { signOut };
}

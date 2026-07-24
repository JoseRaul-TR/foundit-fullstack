// apps/web/app/composables/useAuth.ts
//
// Thin wrapper around Better Auth's sign-out endpoint, mirroring the raw
// $fetch style already used in plugins/auth.ts (not routed through
// useApi()/apiFetch — that composable's 401-redirect behavior doesn't
// apply here, and would be redundant since we redirect manually anyway).
export function useAuth() {
  const { public: publicConfig } = useRuntimeConfig();
  const authStore = useAuthStore();

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
      await navigateTo("/");
    }
  }

  return { signOut };
}

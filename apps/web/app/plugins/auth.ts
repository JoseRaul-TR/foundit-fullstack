// apps/web/app/plugins/auth.ts
//
// Initializes auth state before the first page render, per #59's
// acceptance criteria. Calls Better Auth's session-check endpoint
// directly via $fetch — NOT via useApi()/apiFetch, since apiFetch
// redirects to /login on 401 and an anonymous visitor hitting this
// endpoint is the normal case, not an error to redirect away from.
import type { User } from "@foundit/types";

interface GetSessionResponse {
  session: unknown;
  user: User;
}

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore();
  const { public: publicConfig } = useRuntimeConfig();

  try {
    const response = await $fetch<GetSessionResponse | null>(
      "/api/v1/auth/get-session",
      {
        baseURL: publicConfig.apiBase,
        credentials: "include",
        // On the server, $fetch has no visibility into the browser's
        // cookies unless forwarded explicitly from the incoming
        // request — without this, SSR would always render as
        // anonymous even for a logged-in visitor, causing a hydration
        // mismatch once the client-side check corrects it.
        headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
      },
    );

    authStore.setUser(response?.user ?? null);
  } catch {
    // No session, or the auth service is unreachable — either way,
    // treat as anonymous rather than blocking app boot.
    authStore.setUser(null);
  }
});

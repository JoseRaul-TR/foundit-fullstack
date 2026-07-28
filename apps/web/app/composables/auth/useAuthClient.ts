// apps/web/app/composables/auth/useAuthClient.ts
//
// Singleton Better Auth Vue client. Lazily created on first call (needs
// useRuntimeConfig(), only callable within a Nuxt composable/setup
// context, so it can't be built at true module-load time). Safe as a
// module-level singleton even under SSR: createAuthClient() only holds
// static config (baseURL/basePath), never per-request auth state — every
// actual call (signIn/signUp/signOut) only ever runs client-side in
// response to a real user action, never during server render.
import { createAuthClient } from "better-auth/vue";

type AuthClient = ReturnType<typeof createAuthClient>;

let client: AuthClient | null = null;

export function useAuthClient(): AuthClient {
  if (!client) {
    const { public: publicConfig } = useRuntimeConfig();
    client = createAuthClient({
      baseURL: publicConfig.apiBase,
      basePath: "/api/v1/auth", // must match lib/auth.ts's basePath in apps/api
    });
  }
  return client;
}

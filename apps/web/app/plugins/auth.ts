// apps/web/app/plugins/auth.ts
//
// Initializes auth state before the first page render, per #59's
// acceptance criteria. Calls Better Auth's session-check endpoint
// directly via $fetch — NOT via useApi()/apiFetch, since apiFetch
// redirects to /login on 401 and an anonymous visitor hitting this
// endpoint is the normal case, not an error to redirect away from.

// Better Auth's own session shape, which is NOT ours. `id`, `email` and
// `name` happen to coincide, which is why declaring the response as `User`
// went unnoticed for months: the single field that differs is `image`, and
// nothing read it until #313 built UserAvatar. A `$fetch<T>` is an assertion
// about a runtime payload, not a check — the type checker had no way to say
// so (#305).
interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
}

interface GetSessionResponse {
  session: unknown;
  user: SessionUser;
}

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore();
  const apiBase = useApiBase();

  try {
    const response = await $fetch<GetSessionResponse | null>(
      "/api/v1/auth/get-session",
      {
        baseURL: apiBase,
        credentials: "include",
        // On the server, $fetch has no visibility into the browser's
        // cookies unless forwarded explicitly from the incoming
        // request — without this, SSR would always render as
        // anonymous even for a logged-in visitor, causing a hydration
        // mismatch once the client-side check corrects it.
        headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
      },
    );

    const sessionUser = response?.user;
    authStore.setUser(
      sessionUser
        ? {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.name,
            avatarUrl: sessionUser.image,
            createdAt: new Date(sessionUser.createdAt),
          }
        : null,
    );
  } catch {
    // No session, or the auth service is unreachable — either way,
    // treat as anonymous rather than blocking app boot.
    authStore.setUser(null);
  }
});

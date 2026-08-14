// apps/web/app/stores/auth.ts
//
// Global auth/session state. Hydrated once at app boot by
// app/plugins/auth.ts via Better Auth's own /get-session endpoint — not
// one of apps/api's requireAuth-guarded routes, since checking your own
// session status must work for anonymous visitors too (it's not an
// error case).
import { defineStore } from "pinia";
import type { User } from "@foundit/types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);

  // Derived rather than a separately-set boolean — guarantees
  // isAuthenticated can never drift out of sync with `user`.
  const isAuthenticated = computed(() => user.value !== null);

  function setUser(newUser: User | null) {
    user.value = newUser;
  }

  function clearUser() {
    user.value = null;
    // The profile is a projection of the session: countries, services and the
    // age-rating region only mean anything for the user they belong to. It
    // used to survive a sign-out, so the next visitor — or the same person
    // signed out — kept seeing the previous session's countries pinned in
    // "Where to watch".
    //
    // Here rather than in signOut() because there is more than one way to lose
    // a session: the 401 handler in useApi clears the user too, and any future
    // path will as well. Whoever ends the session shouldn't have to remember
    // what hung off it.
    //
    // Resolved inside the action, not at store setup: this store is created
    // during app boot and shouldn't force another one into existence before
    // anything needs it.
    useProfileStore().reset();
  }

  return { user, isAuthenticated, setUser, clearUser };
});

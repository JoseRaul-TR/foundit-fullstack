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
  }

  return { user, isAuthenticated, setUser, clearUser };
});

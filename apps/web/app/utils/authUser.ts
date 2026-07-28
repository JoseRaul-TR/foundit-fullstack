// apps/web/app/utils/authUser.ts
//
// Better Auth's client-side user object doesn't match our own normalized
// User type (@foundit/types) — it uses `image` instead of `avatarUrl` and
// carries fields (emailVerified, updatedAt) we don't track client-side.
// Single place bridging the two shapes, used right after a successful
// signIn/signUp in login.vue and register.vue.
import type { User } from "@foundit/types";

interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  createdAt: Date;
}

export function toAppUser(betterAuthUser: BetterAuthUser): User {
  return {
    id: betterAuthUser.id,
    email: betterAuthUser.email,
    name: betterAuthUser.name,
    avatarUrl: betterAuthUser.image ?? null,
    createdAt: betterAuthUser.createdAt,
  };
}

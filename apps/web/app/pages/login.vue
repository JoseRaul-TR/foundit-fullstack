<!-- apps/web/app/pages/login.vue -->
<!-- The card lives here now rather than in the layout, so the legal pages can
     be a different shape without arguing with it. -->
<template>
  <div
    class="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8"
  >
    <div
      v-if="showRedirectBanner"
      class="rounded-full bg-surface-elevated px-4 py-2.5 text-center text-sm text-secondary"
    >
      {{ $t("auth.login.redirectBanner") }}
    </div>

    <div class="flex flex-col gap-1 text-center">
      <h1 class="text-xl font-bold text-primary">
        {{ $t("auth.login.title") }}
      </h1>
      <p class="text-sm text-secondary">{{ $t("auth.login.subtitle") }}</p>
    </div>

    <!-- role="alert" so a screen reader hears the refusal. Without it the
         form simply doesn't submit and nothing is said. -->
    <p
      v-if="formError"
      role="alert"
      class="rounded-xl bg-error/10 px-4 py-3 text-sm text-error"
    >
      {{ formError }}
    </p>

    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <AuthField
        id="login-email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="$t('auth.login.emailLabel')"
        :error="emailError"
        @blur="touched.email = true"
      />

      <AuthField
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        :label="$t('auth.login.passwordLabel')"
        :error="passwordError"
        @blur="touched.password = true"
      />

      <button
        type="submit"
        class="flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-page transition hover:brightness-110 disabled:opacity-50"
        :disabled="submitting || googlePending"
      >
        <Spinner v-if="submitting" />
        {{ submitting ? $t("auth.signingIn") : $t("auth.login.submit") }}
      </button>
    </form>

    <div class="flex items-center gap-3 text-xs text-secondary">
      <span class="h-px flex-1 bg-border" />
      {{ $t("auth.login.or") }}
      <span class="h-px flex-1 bg-border" />
    </div>

    <GoogleButton
      :label="$t('auth.login.googleButton')"
      :pending="googlePending"
      :disabled="submitting"
      @click="handleGoogleSignIn"
    />

    <p class="text-center text-sm text-secondary">
      {{ $t("auth.login.noAccount") }}
      <NuxtLink
        :to="localePath('/register')"
        class="font-semibold text-brand hover:underline"
      >
        {{ $t("auth.login.registerLink") }}
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";

definePageMeta({ layout: "auth" });

const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const authStore = useAuthStore();
const authClient = useAuthClient();

// #67 acceptance criteria: "already authenticated users redirected to /"
if (authStore.isAuthenticated) {
  await navigateTo(localePath("/"));
}

const redirectTarget = computed(() => {
  const target = route.query.redirect;
  return typeof target === "string" && target.startsWith("/") ? target : "/";
});
const showRedirectBanner = computed(() => !!route.query.redirect);

const email = ref("");
const password = ref("");
const touched = reactive({ email: false, password: false });
// Two flags, not one: sharing `submitting` made the form's button announce
// "Signing in…" because someone had clicked Google, which is a different
// thing happening somewhere else.
const submitting = ref(false);
const googlePending = ref(false);
const formError = ref("");

const loginSchema = z.object({
  email: z.email(),
  // Not min(8): this password already exists, and the client has no idea what
  // policy was in force when the account was created. Enforcing a length here
  // locks out anyone whose password predates the rule, without validating
  // anything the server won't check anyway.
  password: z.string().min(1),
});

function fieldFails(field: "email" | "password"): boolean {
  const result = loginSchema.safeParse({
    email: email.value,
    password: password.value,
  });
  return (
    !result.success && result.error.issues.some((i) => i.path[0] === field)
  );
}

const emailError = computed(() =>
  touched.email && fieldFails("email")
    ? t("auth.login.validation.invalidEmail")
    : "",
);
const passwordError = computed(() =>
  touched.password && fieldFails("password")
    ? t("auth.login.validation.passwordRequired")
    : "",
);

async function handleSubmit() {
  touched.email = true;
  touched.password = true;
  formError.value = "";

  const result = loginSchema.safeParse({
    email: email.value,
    password: password.value,
  });
  if (!result.success) return;

  submitting.value = true;
  try {
    const { data, error } = await authClient.signIn.email({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      formError.value =
        error.status === 401
          ? t("auth.errors.invalidCredentials")
          : t("errors.generic");
      return;
    }

    authStore.setUser(toAppUser(data.user));
    await navigateTo(localePath(redirectTarget.value));
  } catch {
    formError.value = t("errors.network");
  } finally {
    submitting.value = false;
  }
}

async function handleGoogleSignIn() {
  googlePending.value = true;
  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${localePath(redirectTarget.value)}`,
    });
  } finally {
    googlePending.value = false;
  }
}
</script>

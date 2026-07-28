<!-- apps/web/app/pages/login.vue -->
<template>
  <div class="flex flex-col gap-6">
    <div
      v-if="showRedirectBanner"
      class="rounded-lg bg-surface-elevated px-4 py-3 text-center text-sm text-secondary"
    >
      {{ $t("auth.login.redirectBanner") }}
    </div>

    <div class="flex flex-col gap-1 text-center">
      <h1 class="text-xl font-bold text-primary">
        {{ $t("auth.login.title") }}
      </h1>
      <p class="text-sm text-secondary">{{ $t("auth.login.subtitle") }}</p>
    </div>

    <p
      v-if="formError"
      class="rounded-lg bg-error/10 px-4 py-3 text-sm text-error"
    >
      {{ formError }}
    </p>

    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <label class="flex flex-col gap-1.5 text-sm font-medium text-primary">
        {{ $t("auth.login.emailLabel") }}
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          class="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary"
          :class="{ 'border-error': emailError }"
          @blur="touched.email = true"
        />
        <span v-if="emailError" class="text-xs text-error">{{
          emailError
        }}</span>
      </label>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-primary">
        {{ $t("auth.login.passwordLabel") }}
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          class="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary"
          :class="{ 'border-error': passwordError }"
          @blur="touched.password = true"
        />
        <span v-if="passwordError" class="text-xs text-error">{{
          passwordError
        }}</span>
      </label>

      <button
        type="submit"
        class="rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-page transition hover:brightness-110 disabled:opacity-50"
        :disabled="submitting"
      >
        {{ submitting ? $t("common.loading") : $t("auth.login.submit") }}
      </button>
    </form>

    <div class="flex items-center gap-3 text-xs text-secondary">
      <span class="h-px flex-1 bg-border" />
      {{ $t("auth.login.or") }}
      <span class="h-px flex-1 bg-border" />
    </div>

    <button
      type="button"
      class="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-primary transition hover:border-primary/40 disabled:opacity-50"
      :disabled="submitting"
      @click="handleGoogleSignIn"
    >
      {{ $t("auth.login.googleButton") }}
    </button>

    <p class="text-center text-sm text-secondary">
      {{ $t("auth.login.noAccount") }}
      <NuxtLink
        :to="localePath('/register')"
        class="font-semibold text-accent hover:underline"
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
const submitting = ref(false);
const formError = ref("");

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
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
  submitting.value = true;
  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${localePath(redirectTarget.value)}`,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

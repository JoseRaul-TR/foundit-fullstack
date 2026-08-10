<!-- apps/web/app/pages/register.vue -->
<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1 text-center">
      <h1 class="text-xl font-bold text-primary">
        {{ $t("auth.register.title") }}
      </h1>
      <p class="text-sm text-secondary">{{ $t("auth.register.subtitle") }}</p>
    </div>

    <p
      v-if="formError"
      class="rounded-lg bg-error/10 px-4 py-3 text-sm text-error"
    >
      {{ formError }}
    </p>

    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <label class="flex flex-col gap-1.5 text-sm font-medium text-primary">
        {{ $t("auth.register.nameLabel") }}
        <input
          v-model="name"
          type="text"
          autocomplete="name"
          class="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary"
          :class="{ 'border-error': nameError }"
          @blur="touched.name = true"
        />
        <span v-if="nameError" class="text-xs text-error">{{ nameError }}</span>
      </label>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-primary">
        {{ $t("auth.register.emailLabel") }}
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
        {{ $t("auth.register.passwordLabel") }}
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          class="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary"
          :class="{ 'border-error': passwordError }"
          @blur="touched.password = true"
        />
        <span v-if="password" class="text-xs" :class="strengthColorClass">
          {{
            $t("auth.register.passwordStrength", {
              level: $t(`auth.register.strength.${strength}`),
            })
          }}
        </span>
        <span v-if="passwordError" class="text-xs text-error">{{
          passwordError
        }}</span>
      </label>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-primary">
        {{ $t("auth.register.confirmPasswordLabel") }}
        <input
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          class="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary"
          :class="{ 'border-error': confirmPasswordError }"
          @blur="touched.confirmPassword = true"
        />
        <span v-if="confirmPasswordError" class="text-xs text-error">{{
          confirmPasswordError
        }}</span>
      </label>

      <button
        type="submit"
        class="rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-page transition hover:brightness-110 disabled:opacity-50"
        :disabled="submitting"
      >
        {{ submitting ? $t("common.loading") : $t("auth.register.submit") }}
      </button>
    </form>

    <div class="flex items-center gap-3 text-xs text-secondary">
      <span class="h-px flex-1 bg-border" />
      {{ $t("auth.register.or") }}
      <span class="h-px flex-1 bg-border" />
    </div>

    <button
      type="button"
      class="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-primary transition hover:border-primary/40 disabled:opacity-50"
      :disabled="submitting"
      @click="handleGoogleSignIn"
    >
      {{ $t("auth.register.googleButton") }}
    </button>

    <p class="text-center text-sm text-secondary">
      {{ $t("auth.register.hasAccount") }}
      <NuxtLink
        :to="localePath('/login')"
        class="font-semibold text-accent hover:underline"
      >
        {{ $t("auth.register.loginLink") }}
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";

definePageMeta({ layout: "auth" });

const { t } = useI18n();
const localePath = useLocalePath();
const authStore = useAuthStore();
const authClient = useAuthClient();

if (authStore.isAuthenticated) {
  await navigateTo(localePath("/"));
}

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const touched = reactive({
  name: false,
  email: false,
  password: false,
  confirmPassword: false,
});
const submitting = ref(false);
const formError = ref("");

const registerSchema = z
  .object({
    name: z.string().min(2).max(50),
    email: z.email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

function fieldFails(
  field: "name" | "email" | "password" | "confirmPassword",
): boolean {
  const result = registerSchema.safeParse({
    name: name.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  });
  return (
    !result.success && result.error.issues.some((i) => i.path[0] === field)
  );
}

const nameError = computed(() =>
  touched.name && fieldFails("name")
    ? t("auth.register.validation.nameLength")
    : "",
);
const emailError = computed(() =>
  touched.email && fieldFails("email")
    ? t("auth.register.validation.invalidEmail")
    : "",
);
const passwordError = computed(() =>
  touched.password && fieldFails("password")
    ? t("auth.register.validation.passwordLength")
    : "",
);
const confirmPasswordError = computed(() =>
  touched.confirmPassword && fieldFails("confirmPassword")
    ? t("auth.register.validation.passwordMismatch")
    : "",
);

type Strength = "weak" | "medium" | "strong";

const strength = computed<Strength>(() => {
  const pwd = password.value;
  if (pwd.length < 8) return "weak";
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score >= 3) return "strong";
  if (score >= 1) return "medium";
  return "weak";
});

const strengthColorClass = computed(
  () =>
    ({ weak: "text-error", medium: "text-brand", strong: "text-success" })[
      strength.value
    ],
);

async function handleSubmit() {
  touched.name = true;
  touched.email = true;
  touched.password = true;
  touched.confirmPassword = true;
  formError.value = "";

  const result = registerSchema.safeParse({
    name: name.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  });
  if (!result.success) return;

  submitting.value = true;
  try {
    const { data, error } = await authClient.signUp.email({
      name: result.data.name,
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      formError.value =
        error.status === 422
          ? t("auth.errors.emailInUse")
          : t("errors.generic");
      return;
    }

    authStore.setUser(toAppUser(data.user));
    await navigateTo(localePath("/"));
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
      callbackURL: `${window.location.origin}${localePath("/")}`,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

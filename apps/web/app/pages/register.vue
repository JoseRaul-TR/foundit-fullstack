<!-- apps/web/app/pages/register.vue -->
<template>
  <div
    class="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8"
  >
    <div class="flex flex-col gap-1 text-center">
      <h1 class="text-xl font-bold text-primary">
        {{ $t("auth.register.title") }}
      </h1>
      <p class="text-sm text-secondary">{{ $t("auth.register.subtitle") }}</p>
    </div>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl bg-error/10 px-4 py-3 text-sm text-error"
    >
      {{ formError }}
    </p>

    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <AuthField
        id="register-name"
        v-model="name"
        type="text"
        autocomplete="name"
        :label="$t('auth.register.nameLabel')"
        :error="nameError"
        @blur="touched.name = true"
      />

      <AuthField
        id="register-email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="$t('auth.register.emailLabel')"
        :error="emailError"
        @blur="touched.email = true"
      />

      <AuthField
        id="register-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        :label="$t('auth.register.passwordLabel')"
        :error="passwordError"
        @blur="touched.password = true"
      >
        <!-- Only once there's something to measure: an empty field isn't weak,
             it's empty, and colouring it red for that is a scolding. -->
        <template v-if="password">
          <PasswordStrengthBar :strength="strength" />
          <span class="text-xs" :class="strengthColorClass">
            {{
              $t("auth.register.passwordStrength", {
                level: $t(`auth.register.strength.${strength}`),
              })
            }}
          </span>
        </template>
      </AuthField>

      <AuthField
        id="register-confirm-password"
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        :label="$t('auth.register.confirmPasswordLabel')"
        :error="confirmPasswordError"
        @blur="touched.confirmPassword = true"
      />

      <div class="flex flex-col gap-1">
        <label class="flex items-start gap-2.5 text-sm text-secondary">
          <input
            id="register-terms"
            v-model="termsAccepted"
            name="terms"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 accent-brand focus:ring-2 focus:ring-brand"
            @change="touched.terms = true"
          />
          <!-- i18n-t rather than a concatenated string: the two links sit in
               different places in each language, and gluing them on either
               side of the text would only work in one of the three. -->
          <i18n-t keypath="auth.register.termsLabel" tag="span">
            <template #terms>
              <NuxtLink
                :to="localePath('/terms')"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-brand hover:underline"
              >
                {{ $t("auth.register.termsLink") }}
              </NuxtLink>
            </template>
            <template #privacy>
              <NuxtLink
                :to="localePath('/privacy')"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-brand hover:underline"
              >
                {{ $t("auth.register.privacyLink") }}
              </NuxtLink>
            </template>
          </i18n-t>
        </label>
        <span v-if="termsError" class="text-xs text-error">
          {{ termsError }}
        </span>
      </div>

      <button
        type="submit"
        class="flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-page transition hover:brightness-110 disabled:opacity-50"
        :disabled="submitting || googlePending"
      >
        <Spinner v-if="submitting" />
        {{
          submitting ? $t("auth.creatingAccount") : $t("auth.register.submit")
        }}
      </button>
    </form>

    <div class="flex items-center gap-3 text-xs text-secondary">
      <span class="h-px flex-1 bg-border" />
      {{ $t("auth.register.or") }}
      <span class="h-px flex-1 bg-border" />
    </div>

    <GoogleButton
      :label="$t('auth.register.googleButton')"
      :pending="googlePending"
      :disabled="submitting"
      @click="handleGoogleSignIn"
    />

    <p class="text-center text-sm text-secondary">
      {{ $t("auth.register.hasAccount") }}
      <NuxtLink
        :to="localePath('/login')"
        class="font-semibold text-brand hover:underline"
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
const toast = useToast();

if (authStore.isAuthenticated) {
  await navigateTo(localePath("/"));
}

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const termsAccepted = ref(false);
const touched = reactive({
  name: false,
  email: false,
  password: false,
  confirmPassword: false,
  terms: false,
});
const submitting = ref(false);
const googlePending = ref(false);
const formError = ref("");

const registerSchema = z
  .object({
    name: z.string().min(2).max(50),
    email: z.email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
    terms: z.literal(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

type Field = "name" | "email" | "password" | "confirmPassword" | "terms";

function currentValues() {
  return {
    name: name.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
    terms: termsAccepted.value,
  };
}

function fieldFails(field: Field): boolean {
  const result = registerSchema.safeParse(currentValues());
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
const termsError = computed(() =>
  touched.terms && fieldFails("terms")
    ? t("auth.register.validation.termsRequired")
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
  touched.terms = true;
  formError.value = "";

  const result = registerSchema.safeParse(currentValues());
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
    toast.success(t("auth.register.success"));
    // To the profile, not the home page. The app has nothing personal to show
    // until countries and services are set, so sending a brand-new account to
    // an empty Discover is sending them to the one screen that can't work yet.
    await navigateTo(localePath("/profile"));
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
      callbackURL: `${window.location.origin}${localePath("/profile")}`,
    });
  } finally {
    googlePending.value = false;
  }
}
</script>

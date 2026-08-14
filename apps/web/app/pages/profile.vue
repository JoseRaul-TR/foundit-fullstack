<!-- apps/web/app/pages/profile.vue -->
<!-- Figma 235:2: flat sections on the page, no cards. They were five identical
     bordered boxes, which meant the danger zone looked like everything else —
     it's the only one that keeps its border, and now that's what the border
     says. -->
<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6">
    <h1 class="text-xl font-bold text-primary">{{ $t("profile.title") }}</h1>

    <section class="flex flex-col items-center gap-3 text-center">
      <div class="flex items-center gap-4">
        <img
          v-if="profile?.avatarUrl"
          :src="profile.avatarUrl"
          :alt="profile.name ?? ''"
          class="h-16 w-16 shrink-0 rounded-full object-cover"
        />
        <span
          v-else
          class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-page"
        >
          {{ initials }}
        </span>

        <div class="flex flex-col items-start gap-0.5 text-left">
          <div v-if="editingName" class="flex flex-col gap-2">
            <input
              id="profile-name"
              v-model="nameInput"
              name="name"
              type="text"
              class="rounded-full bg-surface-elevated px-4 py-2 text-base text-primary ring-1 ring-border"
              @keydown.enter="saveName"
              @keydown.escape="editingName = false"
            />
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-page transition hover:brightness-110"
                @click="saveName"
              >
                {{ $t("common.save") }}
              </button>
              <button
                type="button"
                class="rounded-full px-4 py-1.5 text-xs font-semibold text-secondary transition hover:text-primary"
                @click="editingName = false"
              >
                {{ $t("common.cancel") }}
              </button>
            </div>
          </div>

          <!-- A pencil, not a name that turns out to be a button. Text that
               becomes a field when clicked gives no sign it can be, so nobody
               clicks it. -->
          <div v-else class="flex items-center gap-1.5">
            <span class="text-base font-bold text-primary">
              {{ profile?.name ?? "—" }}
            </span>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-full text-secondary transition hover:bg-surface-elevated hover:text-primary"
              :aria-label="$t('profile.editName')"
              @click="startEditName"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>

          <span class="text-sm text-secondary">{{ profile?.email }}</span>
          <!-- Only for accounts that actually came from Google. Everyone used
               to see this, including accounts that never touched it. -->
          <span v-if="isGoogleAccount" class="text-xs text-secondary/70">
            {{ $t("profile.identity.syncedFromGoogle") }}
          </span>
        </div>
      </div>

      <!-- Here rather than at the foot of the page: signing out belongs to who
           you are, and next to "delete account" two ways of leaving would sit
           side by side, one of them permanent. -->
      <button
        type="button"
        class="rounded-full px-4 py-2 text-sm font-semibold text-secondary ring-1 ring-border transition hover:text-primary hover:ring-primary/40"
        @click="signOut"
      >
        {{ $t("profile.logout") }}
      </button>
    </section>

    <CountryServicesSection
      :countries="profileStore.countries"
      :catalog="countriesQuery.data.value ?? []"
      :disabled="countryMutationPending"
      @add="handleAddCountry"
      @remove="handleRemoveCountry"
    />

    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-bold text-primary">
          {{ $t("profile.ageRating.title") }}
        </h2>
        <p class="text-sm text-secondary">
          {{ $t("profile.ageRating.description") }}
        </p>
      </div>

      <CountryPicker
        :options="ageRatingOptions"
        :model-value="profileStore.ageRatingCountry"
        :placeholder="$t('profile.ageRating.selectPlaceholder')"
        :disabled="updatingAgeRating"
        @update:model-value="handleAgeRatingChange"
      />
    </section>

    <section
      class="flex flex-col gap-3 rounded-2xl border border-error/30 bg-surface p-5"
    >
      <h2 class="text-base font-bold text-error">
        ⚠ {{ $t("profile.dangerZone.title") }}
      </h2>
      <p class="text-sm text-secondary">
        {{ $t("profile.dangerZone.description") }}
      </p>
      <button
        type="button"
        class="w-fit rounded-full bg-error px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        @click="showDeleteModal = true"
      >
        {{ $t("profile.dangerZone.deleteAccount") }}
      </button>
    </section>

    <ConfirmDialog
      v-if="showDeleteModal"
      :title="$t('profile.deleteConfirm.title')"
      :description="$t('profile.deleteConfirm.description')"
      :confirm-label="$t('profile.deleteConfirm.confirm')"
      danger
      :pending="deletingAccount"
      @close="showDeleteModal = false"
      @confirm="handleDeleteAccount"
    />
  </div>
</template>

<script setup lang="ts">
import { useToast } from "~/composables/useToast";
import { isUnauthorized } from "~/composables/api/useApi";

definePageMeta({ middleware: "authenticated" });

const profileStore = useProfileStore();
const profileQuery = useProfileQuery();
const countriesQuery = useCountriesQuery();
const { signOut } = useAuth();
const { t } = useI18n();
const toast = useToast();

const profile = computed(() => profileQuery.data.value);

const isGoogleAccount = computed(
  () => profile.value?.authProviders.includes("google") ?? false,
);

const initials = computed(() => {
  const name = profile.value?.name;
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
});

const editingName = ref(false);
const nameInput = ref("");
const { mutateAsync: updateName } = useUpdateNameMutation();

function startEditName() {
  nameInput.value = profile.value?.name ?? "";
  editingName.value = true;
}

async function saveName() {
  if (!nameInput.value.trim()) return;
  try {
    await updateName(nameInput.value.trim());
  } catch (error) {
    if (isUnauthorized(error)) return;
    toast.error(t("feedback.profileName.error"));
    return;
  }
  editingName.value = false;
  toast.success(t("feedback.profileName.success"));
}

const { countryName, sortByCountryName } = useCountryName();

const ageRatingOptions = computed(() =>
  sortByCountryName(profileStore.countries, (c) => c.code).map((c) => ({
    code: c.code,
    name: countryName(c.code, c.name),
  })),
);

const { mutateAsync: addCountry, isPending: addingCountry } =
  useAddCountryMutation();
const { mutateAsync: removeCountry, isPending: removingCountry } =
  useRemoveCountryMutation();
const countryMutationPending = computed(
  () => addingCountry.value || removingCountry.value,
);

async function handleAddCountry(code: string) {
  try {
    await addCountry(code);
  } catch (error) {
    if (isUnauthorized(error)) return;
    toast.error(t("feedback.country.addError"));
    return;
  }
  toast.success(t("feedback.country.addSuccess"));
}

async function handleRemoveCountry(code: string) {
  try {
    await removeCountry(code);
  } catch (error) {
    if (isUnauthorized(error)) return;
    toast.error(t("feedback.country.removeError"));
    return;
  }
  toast.success(t("feedback.country.removeSuccess"));
}

const { mutateAsync: updateAgeRatingCountry, isPending: updatingAgeRating } =
  useUpdateAgeRatingCountryMutation();

async function handleAgeRatingChange(code: string) {
  try {
    await updateAgeRatingCountry(code);
  } catch (error) {
    if (isUnauthorized(error)) return;
    toast.error(t("feedback.ageRating.error"));
    return;
  }
  toast.success(t("feedback.ageRating.success"));
}

const showDeleteModal = ref(false);
const { mutateAsync: deleteAccount, isPending: deletingAccount } =
  useDeleteAccountMutation();

async function handleDeleteAccount() {
  try {
    await deleteAccount();
  } catch (error) {
    if (isUnauthorized(error)) return;
    toast.error(t("feedback.account.deleteError"));
    return;
  }
  showDeleteModal.value = false;
  toast.success(t("feedback.account.deleteSuccess"));
  await signOut();
}
</script>

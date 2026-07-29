<!-- apps/web/app/pages/profile.vue -->
<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6">
    <h1 class="text-xl font-bold text-primary">{{ $t("profile.title") }}</h1>

    <section
      class="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
    >
      <div class="flex items-center gap-4">
        <span
          v-if="!profile?.avatarUrl"
          class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-page"
        >
          {{ initials }}
        </span>
        <img
          v-else
          :src="profile.avatarUrl"
          :alt="profile.name ?? ''"
          class="h-16 w-16 shrink-0 rounded-full object-cover"
        />

        <div class="flex flex-1 flex-col gap-1">
          <div v-if="editingName" class="flex items-center gap-2">
            <input
              v-model="nameInput"
              type="text"
              class="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm text-primary"
              @keydown.enter="saveName"
              @keydown.escape="editingName = false"
            />
            <button
              type="button"
              class="text-xs font-semibold text-accent"
              @click="saveName"
            >
              {{ $t("profile.save") }}
            </button>
          </div>
          <button
            v-else
            type="button"
            class="w-fit text-left text-sm font-semibold text-primary hover:underline"
            @click="startEditName"
          >
            {{ profile?.name ?? "—" }}
          </button>
          <span class="text-xs text-secondary">{{ profile?.email }}</span>
          <span class="text-xs text-secondary/70">
            {{ $t("profile.syncedFromGoogle") }}
          </span>
        </div>
      </div>
    </section>

    <section
      class="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
    >
      <div>
        <h2 class="text-base font-bold text-primary">
          {{ $t("profile.countries.title") }}
        </h2>
        <p class="text-sm text-secondary">
          {{ $t("profile.countries.description") }}
        </p>
      </div>

      <CountrySelector
        :model-value="selectedCountryCodes"
        :countries="countriesQuery.data.value ?? []"
        :disabled="countryMutationPending"
        @update:model-value="handleCountriesChange"
      />
    </section>

    <section
      v-for="code in selectedCountryCodes"
      :key="code"
      class="rounded-2xl border border-border bg-surface p-5"
    >
      <CollapsableSection
        :title="`${$t('profile.streamingServices.title')} — ${countryName(code)}`"
      >
        <p class="mb-3 text-sm text-secondary">
          {{ $t("profile.streamingServices.description") }}
        </p>
        <ServiceSelectorSection :country-code="code" />
      </CollapsableSection>
    </section>

    <section
      class="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
    >
      <div>
        <h2 class="text-base font-bold text-primary">
          {{ $t("profile.ageRating.title") }}
        </h2>
        <p class="text-sm text-secondary">
          {{ $t("profile.ageRating.description") }}
        </p>
      </div>

      <AgeRatingSelect
        :model-value="profileStore.ageRatingCountry"
        :countries="profileStore.countries"
        :disabled="updatingAgeRating"
        @update:model-value="handleAgeRatingChange"
      />
    </section>

    <section
      class="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-surface p-5"
    >
      <h2 class="text-base font-bold text-red-500">
        ⚠ {{ $t("profile.dangerZone.title") }}
      </h2>
      <p class="text-sm text-secondary">
        {{ $t("profile.dangerZone.description") }}
      </p>
      <button
        type="button"
        class="w-fit rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        @click="showDeleteModal = true"
      >
        {{ $t("profile.dangerZone.deleteAccount") }}
      </button>
    </section>

    <DeleteAccountModal
      v-if="showDeleteModal"
      :deleting="deletingAccount"
      @close="showDeleteModal = false"
      @confirm="handleDeleteAccount"
    />
  </div>
</template>

<script setup lang="ts">
import CountrySelector from "~/components/profile/CountrySelector.vue";
import ServiceSelectorSection from "~/components/profile/ServiceSelectorSection.vue";
import AgeRatingSelect from "~/components/profile/AgeRatingSelect.vue";
import DeleteAccountModal from "~/components/profile/DeleteAccountModal.vue";
import CollapsableSection from "~/components/media-detail/CollapsableSection.vue";
import { useToast } from "~/composables/useToast";

definePageMeta({ middleware: "authenticated" });

const profileStore = useProfileStore();
const profileQuery = useProfileQuery();
const countriesQuery = useCountriesQuery();
const { signOut } = useAuth();

const { t } = useI18n();

const profile = computed(() => profileQuery.data.value);

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
  await updateName(nameInput.value.trim());
  editingName.value = false;
}

const selectedCountryCodes = computed(() =>
  profileStore.countries.map((c) => c.code),
);
function countryName(code: string): string {
  return countriesQuery.data.value?.find((c) => c.code === code)?.name ?? code;
}

const { mutateAsync: addCountry, isPending: addingCountry } =
  useAddCountryMutation();
const { mutateAsync: removeCountry, isPending: removingCountry } =
  useRemoveCountryMutation();
const countryMutationPending = computed(
  () => addingCountry.value || removingCountry.value,
);

async function handleCountriesChange(newCodes: string[]) {
  const current = selectedCountryCodes.value;
  const added = newCodes.filter((c) => !current.includes(c));
  const removed = current.filter((c) => !newCodes.includes(c));

  const toast = useToast();

  try {
    for (const code of added) await addCountry(code);
    for (const code of removed) await removeCountry(code);
  } catch {
    toast.error(t("errors.generic"));
  }
}

const { mutateAsync: updateAgeRatingCountry, isPending: updatingAgeRating } =
  useUpdateAgeRatingCountryMutation();

async function handleAgeRatingChange(code: string) {
  await updateAgeRatingCountry(code);
}

const showDeleteModal = ref(false);
const { mutateAsync: deleteAccount, isPending: deletingAccount } =
  useDeleteAccountMutation();

async function handleDeleteAccount() {
  await deleteAccount();
  showDeleteModal.value = false;
  await signOut();
}
</script>

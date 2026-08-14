<!-- apps/web/app/components/media/ProvidersSection.vue -->
<!--
The section the app is named after, rebuilt around one question: can you
watch this, where you live, with what you already pay for.

It used to open on whichever country came first alphabetically, so someone
in Sweden was shown Andorra and had to find their own country in a list of
sixty. Their countries are now pills, pinned in the order they set in their
profile, and the rest live behind one select.

Rent and buy are folded away. They're the two categories that answer a
different question — "you can watch it if you pay again" — and they're also
the two that arrive with ten providers each, so they used to take up most of
the section while saying the least. They open by themselves when they're the
only thing there is, because otherwise the section would look empty while
twelve options sat one tap below.

Free and free-with-ads are one block. TMDB separates them, but both mean "you
don't have to pay", and each heading costs more height than the single pill
it usually labels. The distinction moved into the badge.

Note: rent/buy are NEVER highlighted as "subscribed" even if the backend
marks them — Figma is explicit: "pay-per-item, not account-based".
-->
<template>
  <div v-if="hasAnyCountry" class="flex flex-col gap-4">
    <!-- The pills wrap, and the select drops to its own line on a phone. In a
         single row with `ml-auto` it ended up on its own line anyway, but
         right-aligned and half-width, which reads as an accident rather than a
         decision. 16px text below `sm` on purpose: iOS zooms the whole
         viewport when a control smaller than that takes focus, and a zoomed
         page scrolls sideways — the same reason the search field is 16px. -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="code in pinnedCodes"
          :key="code"
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition"
          :class="
            code === selectedCode
              ? 'bg-brand text-page'
              : 'bg-surface-elevated text-primary hover:text-brand'
          "
          :aria-pressed="code === selectedCode"
          :aria-label="
            hasSubscribedIn(code)
              ? $t('mediaDetail.countrySubscribed', {
                  country: countryName(code),
                })
              : countryName(code)
          "
          @click="selectedCode = code"
        >
          {{ countryName(code) }}
          <!-- Says which of your countries you can watch it in without opening
               any of them. Rent and buy never count towards it. -->
          <span
            v-if="hasSubscribedIn(code)"
            class="h-1.5 w-1.5 rounded-full"
            :class="code === selectedCode ? 'bg-page/70' : 'bg-success'"
            aria-hidden="true"
          />
        </button>

        <!-- The country you just looked up stays as a pill, so going back and
             forth between it and your own costs one tap instead of reopening
             the select and hunting for it again. Only one at a time, and it
             doesn't survive the modal closing. -->
        <span
          v-if="extraCode"
          class="flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border pl-3.5 pr-1.5 text-[13px] font-medium transition"
          :class="
            extraCode === selectedCode
              ? 'bg-brand text-page'
              : 'bg-surface-elevated text-primary'
          "
        >
          <button
            type="button"
            :aria-pressed="extraCode === selectedCode"
            @click="selectedCode = extraCode"
          >
            {{ countryName(extraCode) }}
          </button>
          <button
            type="button"
            class="grid h-5 w-5 place-items-center rounded-full transition hover:bg-white/10"
            :aria-label="
              $t('common.removeCountry', {
                country: countryName(extraCode),
              })
            "
            @click="clearExtra"
          >
            <svg
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      </div>

      <select
        v-if="otherCodes.length"
        class="h-9 w-full shrink-0 rounded-full bg-surface-elevated px-3 text-base font-medium text-primary ring-1 ring-border sm:ml-auto sm:h-8 sm:w-auto sm:text-xs"
        :value="isExtraSelected ? selectedCode : ''"
        :aria-label="$t('mediaDetail.otherCountries')"
        @change="onSelectOther"
      >
        <option value="">{{ $t("mediaDetail.otherCountries") }}</option>
        <option v-for="code in otherCodes" :key="code" :value="code">
          {{ countryName(code) }}
        </option>
      </select>
    </div>

    <div v-if="streamingProviders.length" class="flex flex-col gap-2">
      <span
        class="text-[11px] font-semibold uppercase tracking-[0.66px] text-secondary"
      >
        {{ $t("mediaDetail.providerTypes.flatrate") }}
      </span>
      <div class="flex flex-wrap gap-2">
        <ProviderBadge
          v-for="provider in streamingProviders"
          :key="provider.providerId"
          :name="provider.name"
          :logo-path="provider.logoPath"
          :subscribed="provider.subscribed"
        />
      </div>
    </div>

    <div v-if="freeProviders.length" class="flex flex-col gap-2">
      <span
        class="text-[11px] font-semibold uppercase tracking-[0.66px] text-secondary"
      >
        {{ $t("mediaDetail.providerTypes.free") }}
      </span>
      <div class="flex flex-wrap gap-2">
        <ProviderBadge
          v-for="entry in freeProviders"
          :key="entry.provider.providerId"
          :name="entry.provider.name"
          :logo-path="entry.provider.logoPath"
          :subscribed="entry.provider.subscribed"
          :with-ads="entry.withAds"
        />
      </div>
    </div>

    <p v-if="primaryMessage" class="text-sm text-secondary">
      {{ primaryMessage }}
      <span v-if="secondaryMessage" class="text-primary">
        {{ secondaryMessage }}
      </span>
    </p>

    <div v-if="rentBuyProviders.length" class="flex flex-col gap-2">
      <button
        type="button"
        class="flex w-fit items-center gap-1.5 text-[13px] font-medium text-secondary transition hover:text-primary"
        :aria-expanded="rentBuyOpen"
        @click="rentBuyOpen = !rentBuyOpen"
      >
        {{
          $t("mediaDetail.rentBuyToggle", { count: rentBuyProviders.length })
        }}
        <svg
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-180': rentBuyOpen }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <!-- Split, not merged. A service that both rents and sells appeared
           twice in one list, with nothing to explain why. Two headings turn a
           duplicate into two answers. -->
      <div v-show="rentBuyOpen" class="flex flex-col gap-3">
        <div v-if="rentProviders.length" class="flex flex-col gap-2">
          <span
            class="text-[11px] font-semibold uppercase tracking-[0.66px] text-secondary"
          >
            {{ $t("mediaDetail.providerTypes.rent") }}
          </span>
          <div class="flex flex-wrap gap-2">
            <ProviderBadge
              v-for="provider in rentProviders"
              :key="provider.providerId"
              :name="provider.name"
              :logo-path="provider.logoPath"
            />
          </div>
        </div>

        <div v-if="buyProviders.length" class="flex flex-col gap-2">
          <span
            class="text-[11px] font-semibold uppercase tracking-[0.66px] text-secondary"
          >
            {{ $t("mediaDetail.providerTypes.buy") }}
          </span>
          <div class="flex flex-wrap gap-2">
            <ProviderBadge
              v-for="provider in buyProviders"
              :key="provider.providerId"
              :name="provider.name"
              :logo-path="provider.logoPath"
            />
          </div>
        </div>
      </div>
    </div>

    <a
      v-if="activeGroup?.link"
      :href="activeGroup.link"
      target="_blank"
      rel="noopener noreferrer"
      class="w-fit text-[13px] font-medium text-secondary underline transition hover:text-primary"
    >
      {{ $t("mediaDetail.viewOnTmdb") }}
    </a>

    <div v-if="!authStore.isAuthenticated" class="flex flex-col gap-1">
      <p class="text-[11px] text-secondary">
        {{ $t("mediaDetail.loginToSeeAvailability") }}
      </p>
      <p class="flex gap-3 text-[11px]">
        <NuxtLink :to="localePath('/login')" class="font-semibold text-brand">
          {{ $t("nav.login") }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('/register')"
          class="font-semibold text-brand"
        >
          {{ $t("nav.register") }}
        </NuxtLink>
      </p>
    </div>

    <p class="flex flex-wrap items-center gap-1.5 text-[10px] text-secondary">
      {{ $t("mediaDetail.justWatchAttribution") }}
      <a
        href="https://www.justwatch.com/"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium underline"
      >
        JustWatch
      </a>
      <span aria-hidden="true">·</span>
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0"
      >
        <img
          src="/tmdb-logo.svg"
          alt="TMDB"
          class="h-3 w-auto opacity-70"
          loading="lazy"
        />
      </a>
    </p>
  </div>
  <p v-else class="text-sm text-secondary">
    {{ $t("mediaDetail.noProviders") }}
  </p>
</template>

<script setup lang="ts">
import type { Provider, ProvidersByType } from "@foundit/types";

const props = defineProps<{
  providers: Record<string, ProvidersByType>;
}>();

const authStore = useAuthStore();
const profileStore = useProfileStore();
const { locale, t } = useI18n();
const localePath = useLocalePath();

const availableCodes = computed(() => Object.keys(props.providers));
const hasAnyCountry = computed(() => availableCodes.value.length > 0);

const regionNames = computed(
  () => new Intl.DisplayNames([locale.value], { type: "region" }),
);
function countryName(code: string): string {
  return regionNames.value.of(code) ?? code;
}

const collator = computed(() => new Intl.Collator(locale.value));
const listFormatter = computed(
  () =>
    new Intl.ListFormat(locale.value, { style: "long", type: "conjunction" }),
);

/**
 * Only for visitors with no countries configured. `maximize()` is what makes
 * a bare "es" usable: it expands to "es-Latn-ES" and gives us a region where
 * navigator.language alone gives none.
 *
 * Reading navigator during setup would normally be a hydration hazard — the
 * server has no such object — but this component only ever renders inside the
 * modal, and the modal's store starts empty, so it never server-renders. If
 * the modal is ever made URL-addressable, this is the line to revisit.
 */
function detectBrowserRegion(): string | null {
  if (!import.meta.client) return null;
  const tags = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const tag of tags) {
    const region = new Intl.Locale(tag).maximize().region;
    if (region && props.providers[region]) return region;
  }
  return null;
}

// Every country from the profile, not only the ones with services marked: a
// country you configured is a country you care about, and "nothing here" is
// an answer worth giving.
const pinnedCodes = computed(() => {
  const configured = profileStore.countries.map((country) => country.code);
  if (configured.length > 0) return configured;
  const detected = detectBrowserRegion();
  return detected ? [detected] : [];
});

const otherCodes = computed(() =>
  availableCodes.value
    .filter((code) => !pinnedCodes.value.includes(code))
    .sort((a, b) => collator.value.compare(countryName(a), countryName(b))),
);

const extraCode = ref<string | null>(null);
const selectedCode = ref("");

const isExtraSelected = computed(
  () => extraCode.value !== null && extraCode.value === selectedCode.value,
);

watchEffect(() => {
  const shown = [
    ...pinnedCodes.value,
    ...(extraCode.value ? [extraCode.value] : []),
  ];
  if (!shown.includes(selectedCode.value)) {
    selectedCode.value = pinnedCodes.value[0] ?? availableCodes.value[0] ?? "";
  }
});

function onSelectOther(event: Event) {
  const code = (event.target as HTMLSelectElement).value;
  if (!code) return;
  extraCode.value = code;
  selectedCode.value = code;
}

function clearExtra() {
  if (isExtraSelected.value) {
    selectedCode.value = pinnedCodes.value[0] ?? availableCodes.value[0] ?? "";
  }
  extraCode.value = null;
}

const activeGroup = computed(() => props.providers[selectedCode.value]);

/**
 * Subscribed first, and only when there is one to raise. TMDB's order is its
 * per-country display_priority, which answers "which service matters most
 * here" rather than "which do you have" — so the highlight could sit sixth
 * and the eye read five negatives before reaching the answer. sort is stable,
 * so TMDB's order survives within each group.
 */
function subscribedFirst(list: Provider[]): Provider[] {
  if (!list.some((provider) => provider.subscribed)) return list;
  return [...list].sort(
    (a, b) => Number(b.subscribed ?? false) - Number(a.subscribed ?? false),
  );
}

const streamingProviders = computed(() =>
  subscribedFirst(activeGroup.value?.flatrate ?? []),
);

const freeProviders = computed(() => {
  const group = activeGroup.value;
  if (!group) return [];
  // Genuinely free first, ad-supported after, so the marked ones group
  // together instead of being scattered through the row.
  const entries = [
    ...group.free.map((provider) => ({ provider, withAds: false })),
    ...group.ads.map((provider) => ({ provider, withAds: true })),
  ];
  if (!entries.some((entry) => entry.provider.subscribed)) return entries;
  return [...entries].sort(
    (a, b) =>
      Number(b.provider.subscribed ?? false) -
      Number(a.provider.subscribed ?? false),
  );
});

const rentProviders = computed(() => activeGroup.value?.rent ?? []);
const buyProviders = computed(() => activeGroup.value?.buy ?? []);
// The toggle counts options, not services: renting and buying from the same
// platform are two things you can do.
const rentBuyProviders = computed(() => [
  ...rentProviders.value,
  ...buyProviders.value,
]);

function hasStreamingIn(code: string): boolean {
  const group = props.providers[code];
  if (!group) return false;
  return group.flatrate.length + group.free.length + group.ads.length > 0;
}

function hasSubscribedIn(code: string): boolean {
  const group = props.providers[code];
  if (!group) return false;
  return [group.flatrate, group.free, group.ads].some((list) =>
    list.some((provider) => provider.subscribed),
  );
}

const hasStreaming = computed(() => hasStreamingIn(selectedCode.value));

const rentBuyOpen = ref(false);
// Open by itself when it's all there is: folding it away would leave the
// section looking empty while the message above talks about twelve options.
watch(
  [selectedCode, hasStreaming],
  () => {
    rentBuyOpen.value =
      !hasStreaming.value && rentBuyProviders.value.length > 0;
  },
  { immediate: true },
);

const primaryMessage = computed(() => {
  if (hasStreaming.value || !selectedCode.value) return "";
  const country = countryName(selectedCode.value);
  // "No options" rather than "not available": TMDB reports what it knows, and
  // silence from it isn't the same claim as a title being unavailable.
  return rentBuyProviders.value.length
    ? t("mediaDetail.availability.rentBuyOnly", { country })
    : t("mediaDetail.availability.noneHere", { country });
});

const secondaryMessage = computed(() => {
  if (hasStreaming.value || !selectedCode.value) return "";

  // Your other countries come from the same payload, so answering "then where
  // can I watch it" costs nothing.
  const mine = pinnedCodes.value.filter(
    (code) => code !== selectedCode.value && hasStreamingIn(code),
  );
  if (mine.length > 0) {
    return t("mediaDetail.availability.streamingIn", {
      countries: listFormatter.value.format(mine.map(countryName)),
    });
  }

  // Only when none of your own countries has it — otherwise a worldwide count
  // is noise next to a real answer.
  const elsewhere = availableCodes.value.filter(
    (code) =>
      code !== selectedCode.value &&
      !pinnedCodes.value.includes(code) &&
      hasStreamingIn(code),
  ).length;

  return elsewhere > 0
    ? t("mediaDetail.availability.elsewhereCount", { count: elsewhere })
    : "";
});
</script>

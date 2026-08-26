<!-- apps/web/app/pages/privacy.vue -->
<!-- No longer a placeholder. #249's test round collects through four channels,
     three of which are not anonymous, and a page saying "under construction" is
     not where that gets disclosed. The full policy still belongs to launch;
     what belongs here is a short, honest note.

     The sections are written out rather than looped over an array of keys:
     a v-for would be six lines shorter and would make `legal.privacyNote.account`
     ungreppable, which in a repo this size costs more than it saves. -->
<template>
  <LegalDocument :title="$t('legal.privacy')">
    <p>{{ $t("legal.privacyNote.intro") }}</p>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold text-primary">
        {{ $t("legal.privacyNote.analytics.heading") }}
      </h2>
      <p>{{ $t("legal.privacyNote.analytics.body") }}</p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold text-primary">
        {{ $t("legal.privacyNote.form.heading") }}
      </h2>
      <p>{{ $t("legal.privacyNote.form.body") }}</p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold text-primary">
        {{ $t("legal.privacyNote.github.heading") }}
      </h2>
      <p>{{ $t("legal.privacyNote.github.body") }}</p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold text-primary">
        {{ $t("legal.privacyNote.account.heading") }}
      </h2>
      <p>{{ $t("legal.privacyNote.account.body") }}</p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold text-primary">
        {{ $t("legal.privacyNote.retention.heading") }}
      </h2>
      <p>{{ $t("legal.privacyNote.retention.body") }}</p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold text-primary">
        {{ $t("legal.privacyNote.contact.heading") }}
      </h2>
      <p>{{ $t("legal.privacyNote.contact.body") }}</p>
    </section>

    <p class="text-xs">{{ $t("legal.privacyNote.updated") }}</p>
  </LegalDocument>
</template>

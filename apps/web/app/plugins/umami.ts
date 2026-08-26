// apps/web/app/plugins/umami.ts
//
// Umami Cloud, chosen in #249. No consent gate and no cookie banner, and that
// absence is deliberate: Umami's own documentation states that it "does not
// use any cookies in the tracking code", collects no personally identifiable
// information and anonymises what it does collect. Nothing here needs consent
// because nothing here is personal data.
//
// A plugin rather than `app.head.script` in nuxt.config, because the id has to
// come from runtimeConfig: nuxt.config is evaluated at build time, so a value
// read there is baked into the bundle and changing it means rebuilding.
export default defineNuxtPlugin(() => {
  // Not in development. Otherwise every `pnpm dev` reload lands in the same
  // dataset as the tester round, and most of the round is the developer.
  if (import.meta.dev) return;

  const { umamiScriptUrl, umamiWebsiteId } = useRuntimeConfig().public;
  if (!umamiScriptUrl || !umamiWebsiteId) return;

  useHead({
    script: [
      { src: umamiScriptUrl, defer: true, "data-website-id": umamiWebsiteId },
    ],
  });
});

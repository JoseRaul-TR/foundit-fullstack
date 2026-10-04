// apps/web/app/plugins/umami.ts
//
// Umami Cloud, chosen in #249. No consent gate and no cookie banner. Umami's
// own documentation states that it "does not use any cookies in the tracking
// code", and that is a claim about cookies. It is not a claim that the data
// is anonymous: the fields it records can be combined to recognise a device
// from one visit to the next, which is what #278 did, and the privacy page
// says so (#352).
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
      {
        src: umamiScriptUrl,
        defer: true,
        "data-website-id": umamiWebsiteId,
        // The search box puts the query in the URL (`/?q=jumanji&type=multi`)
        // and Umami records the full URL. Without this, what people look for
        // lands in the statistics, and the privacy page does not list it (#352).
        "data-exclude-search": "true",
      },
    ],
  });
});

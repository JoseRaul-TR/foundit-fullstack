// apps/web/app/composables/api/useApiBase.ts
//
// Resolves which base URL to use for calls to apps/api, which differs
// between server and client:
//
// - Browser: runtimeConfig.public.apiBase. In production that's the same
//   origin the page was served from (one Render service serves both the API
//   and Nuxt), which is what keeps Better Auth's session cookie first-party.
//   In development it's the separate API dev server on :3001.
//
// - Server (SSR): loopback. In production the API lives in this very
//   process, so going out to the public URL would mean a pointless round
//   trip through Cloudflare and Render's proxy back into ourselves. In
//   development it reaches the separate API dev server, which listens on the
//   same default port.
export function useApiBase(): string {
  const { public: publicConfig } = useRuntimeConfig();

  if (import.meta.server) {
    // PORT is injected by Render in production; unset locally, where the API
    // dev server uses its own default of 3001 (see apps/api/src/config/env.ts).
    const port = process.env.PORT ?? "3001";
    return `http://127.0.0.1:${port}`;
  }

  return publicConfig.apiBase;
}

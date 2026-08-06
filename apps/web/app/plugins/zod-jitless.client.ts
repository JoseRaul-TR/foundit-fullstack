// apps/web/app/plugins/zod-jitless.client.ts
import { z } from "zod";

/**
 * Zod feature-probes for `new Function("")` to decide whether it can compile
 * optimised validators. The probe is wrapped in try/catch, so under our CSP it
 * fails harmlessly and Zod falls back to its interpreted path -- but the
 * browser still reports the blocked attempt, once per page.
 *
 * `jitless` skips the probe entirely. It costs nothing here: under a CSP
 * without 'unsafe-eval' the JIT path was never available in the first place,
 * so all we lose is an attempt that was always going to fail.
 *
 * Client only (.client.ts). Node has no CSP, the probe succeeds there, and the
 * API genuinely benefits from the compiled path.
 *
 * Requires zod >= 4.4: before that release `allowsEval` never consulted this
 * flag and probed regardless (colinhacks/zod#5864). We're on 4.4.3, deduplicated
 * across the whole workspace, so this one call also covers Better Auth's usage.
 */
export default defineNuxtPlugin({
  name: "zod-jitless",
  enforce: "pre",
  setup() {
    z.config({ jitless: true });
  },
});

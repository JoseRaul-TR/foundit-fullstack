// apps/web/tests/setup.ts
//
// Runs before every test file. Two jobs: unmount what a test mounted, and
// make sure no state survives into the next one.
import { enableAutoUnmount } from "@vue/test-utils";
import { afterEach } from "vitest";

// Without this, a component mounted in one test stays mounted for the rest of
// the file — its watchers keep running and its timers keep firing.
enableAutoUnmount(afterEach);

// NOTE, to be settled while writing the first real test (#85):
//
// #200 decided that Pinia and the QueryClient are reset per test, here. What
// this file does NOT yet do is that reset, because it is not clear where the
// instances come from.
//
// Under `environment: "nuxt"` the test app boots with its own plugins,
// including @pinia/nuxt and whatever installs VueQuery. So there is already a
// Pinia and a QueryClient, and creating a second pair here would leave the
// components reading one while the test writes the other — the exact shape of
// failure #218 produced with two query keys.
//
// Two candidate approaches, neither verified:
//   1. Reach the app's own instances from inside a test (`useNuxtApp()`) and
//      reset them there.
//   2. Find out whether @nuxt/test-utils already gives each file a fresh app,
//      in which case the leak is only within a file and `$reset()` on the
//      stores a test touched is enough.
//
// Whichever it turns out to be, write it here and delete this note.

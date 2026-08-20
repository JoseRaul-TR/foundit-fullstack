// apps/web/tests/smoke.test.ts
//
// Proves the harness before anything depends on it. WatchlistButton rather
// than a component invented for the test: it is real, it is small, and it
// exercises the three things that have to work — mounting through
// mountSuspended, auto-imports resolving on their own, and $t returning a
// translated string rather than a key.
//
// The SFC is imported rather than resolved by name. Mounting by name was tried
// and does not work: unimport rewrites component references at build time, and
// a runtime template string never passes through that transform, so Vue fails
// to resolve WatchlistButton. Component auto-imports are for .vue files, not
// for templates a test writes.
import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import WatchlistButton from "~/components/media/WatchlistButton.vue";

describe("test harness", () => {
  it("mounts a component and renders translated text", async () => {
    const wrapper = await mountSuspended(WatchlistButton, {
      props: { active: false, pending: false },
    });

    const button = wrapper.get("button");
    expect(button.attributes("aria-pressed")).toBe("false");
    // The assertion that matters: if i18n were not wired, this would read
    // "mediaDetail.addToWatchlist".
    expect(button.text()).not.toContain("mediaDetail.");
    expect(button.text().length).toBeGreaterThan(1);
  });

  it("reflects props", async () => {
    const wrapper = await mountSuspended(WatchlistButton, {
      props: { active: true, pending: true },
    });

    const button = wrapper.get("button");
    expect(button.attributes("aria-pressed")).toBe("true");
    expect(button.attributes("disabled")).toBeDefined();
  });
});

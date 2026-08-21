// apps/web/tests/searchBar.test.ts
//
// #85. The component holds no props and no state of its own beyond the input:
// it reads the search store, and writes by navigating. So the assertions are
// about two things — what the input shows, and where the app ends up.
//
// No mock of useSearch, per #200. `SearchBar` makes no requests: `search()`
// and `clear()` only call `navigateTo`, and index.vue is what fetches in
// response to the route change.
//
// So the observable is the route, and it works — for navigations the test
// makes itself and for those the component makes. The one exception is a
// route the test sets up for the component to read: those do not reach the
// router `useSearch` holds. See the note above the remaining `it.todo`.
//
// Fake timers are switched on per test rather than in beforeEach, and always
// AFTER any navigateTo and after mountSuspended. Both await promises that a
// frozen clock never settles, so a test that fakes the clock first hangs until
// the 15s timeout rather than failing. Measured: three tests, 45 seconds.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import { navigateTo, useNuxtApp } from "#app";
import type { Router } from "vue-router";
import SearchBar from "~/components/search/SearchBar.vue";
import { useSearchStore } from "~/stores/search";

const DEBOUNCE_MS = 400;

async function mountBar() {
  return await mountSuspended(SearchBar);
}

// useNuxtApp().$router rather than vue-router's useRouter(): the latter is an
// inject() and returns undefined outside a setup, which is what a test body
// is. Same shape as #211, in a place that only warns.
function currentQuery() {
  return (useNuxtApp().$router as Router).currentRoute.value.query;
}

beforeEach(async () => {
  // No createPinia() here: the nuxt environment already installs one through
  // @pinia/nuxt, and creating a second leaves the test writing to a store the
  // component never reads. This is the trap tests/setup.ts's note describes.
  useSearchStore().$reset();
  await navigateTo("/");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SearchBar", () => {
  it("renders as a search landmark with a labelled field", async () => {
    const wrapper = await mountBar();

    expect(wrapper.get("form").attributes("role")).toBe("search");
    const input = wrapper.get("input");
    expect(input.attributes("aria-label")).toBeTruthy();
    expect(input.attributes("placeholder")).toBeTruthy();
    // Not a key: i18n is wired, and the label is what a screen reader reads.
    expect(input.attributes("aria-label")).not.toContain("search.");
  });

  // The case a shared /?q=… link depends on: index.vue resolves the query
  // during SSR, so the field must arrive holding it rather than empty.
  it("seeds its value from the store", async () => {
    useSearchStore().query = "dune";

    const wrapper = await mountBar();

    expect(wrapper.get("input").element.value).toBe("dune");
  });

  it("navigates once, after the debounce and not before", async () => {
    const wrapper = await mountBar();
    vi.useFakeTimers();

    await wrapper.get("input").setValue("dune");

    // Half way through: nothing has happened yet.
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(currentQuery().q).toBeUndefined();

    // The remaining millisecond fires the debounce; the extra time is for
    // navigateTo, which is async and does not complete within the same tick.
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(currentQuery()).toMatchObject({ q: "dune", type: "multi" });
  });

  it("does not navigate for fewer than three characters, however long", async () => {
    const wrapper = await mountBar();
    vi.useFakeTimers();

    await wrapper.get("input").setValue("du");

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 10);
    expect(currentQuery().q).toBeUndefined();
  });

  it("collapses rapid typing into one navigation", async () => {
    const wrapper = await mountBar();
    vi.useFakeTimers();

    const input = wrapper.get("input");
    for (const value of ["dun", "dune", "dune ", "dune 2"]) {
      await input.setValue(value);
      await vi.advanceTimersByTimeAsync(50);
    }

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(currentQuery().q).toBe("dune 2");
  });

  // The defect the `else if` branch was added for: deleting the text by hand
  // left the URL carrying the old query and the page rendering results the
  // field no longer showed. Clearing with the ✕ always worked, because that
  // button calls search.clear() itself — which is why the failure looked like
  // it depended on the phase of the moon.
  it("navigates back without q when a search is emptied by hand", async () => {
    useSearchStore().query = "dune";
    await navigateTo({ path: "/", query: { q: "dune", type: "multi" } });

    const wrapper = await mountBar();
    vi.useFakeTimers();

    await wrapper.get("input").setValue("");

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(currentQuery().q).toBeUndefined();
  });

  // `tab` belongs to Discover, not to search. Dropping it is what made leaving
  // and re-entering search land on the wrong tab (#206).
  //
  // Not testable through SearchBar. Measured 21 Aug: a navigateTo made by the
  // test is visible to `useNuxtApp().$router` but not to the `useRouter()`
  // that `useSearch` holds inside the mounted component — it reads fullPath
  // "/" while the test reads "/?tab=series". Navigations made by the component
  // do propagate the other way, which is why every other route assertion in
  // this file works.
  //
  // So the precondition this case needs — a route already carrying `tab` that
  // the component can read — cannot be set up from here. Testing `useSearch`
  // directly is the shape that fits: `tab` is its logic, and SearchBar only
  // delegates. That is a composable test rather than a component one, and it
  // belongs in its own ticket rather than here.
  it.todo("carries tab through, in both directions");

  describe("the clear button", () => {
    it("appears only when the field has content", async () => {
      const wrapper = await mountBar();
      expect(wrapper.findAll("button")).toHaveLength(0);

      await wrapper.get("input").setValue("d");
      expect(wrapper.findAll("button")).toHaveLength(1);
    });

    // Also asserts that focus returns to the input rather than to the top of
    // the document. `document.activeElement` reads <body> here: mountSuspended
    // does not attach to the document, so inputRef.focus() has nothing to
    // focus. `attachTo: document.body` is the likely fix and is untried.
    it("empties the field, clears the search and returns focus", async () => {
      useSearchStore().query = "dune";
      await navigateTo({ path: "/", query: { q: "dune", type: "multi" } });

      // attachTo so inputRef.focus() has a document to focus into —
      // mountSuspended does not attach by default, and document.activeElement
      // stays on <body>. enableAutoUnmount in tests/setup.ts cleans it up.
      const wrapper = await mountSuspended(SearchBar, {
        attachTo: document.body,
      });
      vi.useFakeTimers();

      await wrapper.get("button").trigger("click");
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(wrapper.get("input").element.value).toBe("");
      expect(currentQuery().q).toBeUndefined();
      // Focus goes back where the user was, not to the top of the document.
      expect(document.activeElement).toBe(wrapper.get("input").element);
    });
  });

  it("follows the store when the query changes underneath it", async () => {
    const wrapper = await mountBar();
    expect(wrapper.get("input").element.value).toBe("");

    // What the back button and a shared link do.
    useSearchStore().query = "arrival";
    await nextTick();

    expect(wrapper.get("input").element.value).toBe("arrival");
  });

  it("marks itself active when focused and when holding text", async () => {
    const wrapper = await mountBar();
    const pill = wrapper.get("form > div");
    const restingClass = pill.attributes("class");

    await wrapper.get("input").trigger("focus");
    expect(pill.attributes("class")).not.toBe(restingClass);

    await wrapper.get("input").trigger("blur");
    await wrapper.get("input").setValue("dune");
    expect(pill.attributes("class")).not.toBe(restingClass);
  });
});

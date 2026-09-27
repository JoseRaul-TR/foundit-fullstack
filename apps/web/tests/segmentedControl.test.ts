// apps/web/tests/segmentedControl.test.ts
//
// The keyboard contract SegmentedControl promises by announcing itself as a
// radio group (#282): one tab stop, arrow keys move and select with
// wraparound, focus follows, modified arrows are left to the browser.
// VoiceOver verified it once; this keeps it from drifting silently. Nothing
// else exercises it — the type check and the lint pass with the keyboard
// handler deleted.
//
// Mounted with a fixed modelValue that is never updated from the emit. That
// is the situation the callers create: they confirm a new value only after a
// navigation, so the component has to behave correctly while modelValue lags.
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import SegmentedControl from "~/components/ui/SegmentedControl.vue";

const options = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
];

const mounted: { unmount: () => void }[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

// Attached to the document: focus() does nothing on a detached element, and
// "focus follows the selection" is half of what is being tested.
async function mountControl(modelValue: string) {
  const wrapper = await mountSuspended(SegmentedControl, {
    props: { modelValue, options, ariaLabel: "Filter by type" },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}

type Control = Awaited<ReturnType<typeof mountControl>>;

function radio(wrapper: Control, index: number): HTMLElement {
  const el = wrapper.findAll('[role="radio"]')[index]?.element;
  if (!(el instanceof HTMLElement)) throw new Error(`No radio at ${index}`);
  return el;
}

// Dispatched by hand rather than through trigger(), to keep the event and
// read defaultPrevented afterwards.
function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
}

describe("SegmentedControl keyboard contract", () => {
  it("announces a radio group and marks the checked option", async () => {
    const wrapper = await mountControl("movie");

    const group = wrapper.get('[role="radiogroup"]');
    expect(group.attributes("aria-label")).toBe("Filter by type");
    expect(
      wrapper
        .findAll('[role="radio"]')
        .map((b) => b.attributes("aria-checked")),
    ).toEqual(["false", "true", "false"]);
  });

  it("gives the group a single tab stop, on the checked option", async () => {
    const wrapper = await mountControl("movie");

    expect(
      wrapper.findAll('[role="radio"]').map((b) => b.attributes("tabindex")),
    ).toEqual(["-1", "0", "-1"]);
  });

  it("falls back to the first option when nothing is checked", async () => {
    const wrapper = await mountControl("person");

    expect(
      wrapper.findAll('[role="radio"]').map((b) => b.attributes("tabindex")),
    ).toEqual(["0", "-1", "-1"]);
  });

  it.each([
    ["ArrowRight", 0, 1],
    ["ArrowDown", 0, 1],
    ["ArrowLeft", 1, 0],
    ["ArrowUp", 1, 0],
    ["ArrowRight", 2, 0],
    ["ArrowLeft", 0, 2],
  ])(
    "%s from option %i selects option %i and moves focus there",
    async (key, from, to) => {
      const wrapper = await mountControl("all");

      const event = press(radio(wrapper, from), key);

      expect(wrapper.emitted("update:modelValue")).toEqual([
        [options[to]?.value],
      ]);
      expect(document.activeElement).toBe(radio(wrapper, to));
      expect(event.defaultPrevented).toBe(true);
    },
  );

  it("counts from the focused option, not from a modelValue that lags", async () => {
    // modelValue still says "all", but the previous press already moved focus
    // to "movie". The next press has to go on to "series", not back to "movie".
    const wrapper = await mountControl("all");

    press(radio(wrapper, 1), "ArrowRight");

    expect(wrapper.emitted("update:modelValue")).toEqual([["series"]]);
  });

  it.each(["altKey", "ctrlKey", "metaKey"])(
    "leaves arrows with %s to the browser",
    async (modifier) => {
      const wrapper = await mountControl("movie");

      const event = press(radio(wrapper, 1), "ArrowLeft", { [modifier]: true });

      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it.each(["Home", "End", "a"])("ignores %s", async (key) => {
    const wrapper = await mountControl("movie");

    const event = press(radio(wrapper, 1), key);

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(event.defaultPrevented).toBe(false);
  });
});

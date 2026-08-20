// apps/web/tests/i18n-parity.test.ts
//
// The one i18n test that does not couple itself to a string. #200's decision
// was to assert on roles and accessible names in component tests, which keeps
// them readable and survives copy edits — but leaves the other two locales
// unchecked entirely.
//
// This covers them, and it covers the failure that actually happens: a key
// added to en.json and forgotten in sv.json, which ships a raw
// "watchlist.sortBy.title" to a Swedish user.
//
// Read from disk rather than imported. @nuxtjs/i18n precompiles messages
// containing interpolation into a vue-i18n AST at build time, so an `import`
// under the nuxt environment yields node objects — `body`, `items`, `loc`,
// `type` — instead of strings. Worse, the AST differs *legitimately* between
// locales: "Remove {country}?" starts with text in one language and with the
// placeholder in another, so the two produce different node shapes and the
// comparison reports a difference that is a correct translation.
//
// fs + JSON.parse sidesteps the transform entirely, and the files on disk are
// what this test is about anyway.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// process.cwd() rather than import.meta.url: under the `nuxt` environment
// import.meta.url is not a file: URL, and fileURLToPath rejects it. Vitest
// runs from apps/web, which is where this path is relative to.
const LOCALE_DIR = resolve(process.cwd(), "i18n/locales");

function load(code: string): unknown {
  return JSON.parse(readFileSync(resolve(LOCALE_DIR, `${code}.json`), "utf8"));
}

/** "a.b.c" for every leaf, so nesting differences show up as missing keys. */
function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leaves(value: unknown, prefix = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

const locales = { en: load("en"), es: load("es"), sv: load("sv") };
const reference = flatten(locales.en).sort();

describe("locale files", () => {
  for (const [code, messages] of Object.entries(locales)) {
    it(`${code} carries exactly the same keys as en`, () => {
      const keys = flatten(messages).sort();

      // Named both ways: "missing" is the one that ships a raw key to a user,
      // "extra" is dead weight that suggests a rename went half-done.
      const missing = reference.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !reference.includes(k));

      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });

    it(`${code} has no empty values`, () => {
      const empty = leaves(messages)
        .filter(([, value]) => typeof value === "string" && !value.trim())
        .map(([key]) => key);

      expect(empty).toEqual([]);
    });
  }
});

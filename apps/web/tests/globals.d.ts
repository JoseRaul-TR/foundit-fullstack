// apps/web/tests/globals.d.ts
//
// tsconfig.test.json extends .nuxt/tsconfig.app.json, but the tests are not in
// that project's `include`, so the ambient declarations that give a template
// its global `$t` do not reach any SFC imported from here — vue-tsc then
// reports `$t` missing in components that are correct and pass under
// `nuxt typecheck`.
//
// A `/// <reference>` adds to the type set rather than replacing it, which is
// why this is a declaration file and not `compilerOptions.types`.
/// <reference types="@nuxtjs/i18n" />

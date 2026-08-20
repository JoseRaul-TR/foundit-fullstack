// eslint.config.js

// Single flat config for the whole monorepo, run from the root with
// `pnpm lint`.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    // Flat config has no .eslintignore — ignores live here.
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nuxt/**",
      "**/.output/**",
      "apps/api/prisma/migrations/**",
      // Prisma's generated client: thousands of lines we neither wrote nor
      // control, and covered by no tsconfig.
      "apps/api/generated/**",
    ],
  },

  js.configs.recommended,

  // ——— Standalone config files ———
  // These sit outside every tsconfig's `include`, so type-aware rules can't
  // process them. Syntax-level rules only.
  {
    files: ["**/*.config.ts", "**/*.config.mjs", "apps/api/prisma/seed.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // ——— apps/api: full type-aware linting ———
  {
    files: ["apps/api/src/**/*.ts", "apps/api/tests/**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Express identifies error handlers by arity, so `next` must stay in the
      // signature even when unused. Underscore-prefixing is the convention for
      // "deliberately unused".
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // ——— apps/api tests ———
  {
    files: ["apps/api/tests/**/*.ts"],
    rules: {
      // Supertest types res.body as `any` by design — asserting on it is the
      // entire point of an integration test, so these rules only produce noise.
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // Test helpers keep an async signature for consistency with the ones
      // that genuinely await, even when a particular helper doesn't.
      "@typescript-eslint/require-await": "off",
    },
  },

  // ——— apps/web, .ts files ———
  {
    files: ["apps/web/**/*.ts"],
    // Config files at the package root are outside tsconfig's `include`, so
    // they can't be type-checked — they're handled by the syntax-only block
    // above and must not be re-matched here.
    //
    // Tests likewise: they belong to no tsconfig Nuxt generates, and the block
    // below parses them without a project. Leaving them matched here would
    // pin projectService: true, which is what produces "was not found by the
    // project service".
    ignores: ["**/*.config.ts", "apps/web/tests/**"],

    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Nuxt auto-imports (useRuntimeConfig, useRoute, navigateTo, ref...) are
      // correctly typed for vue-tsc but unresolvable from ESLint's project
      // service, so the no-unsafe-* family here is 100% false positives. The
      // rules that actually earn their keep — no-floating-promises,
      // no-misused-promises, require-await — are unaffected and stay on.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },

  // ——— apps/web tests ———
  // They belong to no tsconfig Nuxt generates, and giving them one
  // (tsconfig.test.json, referenced from tsconfig.json) makes `nuxt typecheck`
  // walk that project and report every auto-import inside an imported SFC as
  // missing — ten errors in SearchBar.vue for `ref`, `watch`, `computed`,
  // `onUnmounted` and `useSearch`, none of them real.
  //
  // So they are parsed without a project, which is why the block above
  // excludes them: it pins projectService: true, and flat config merges
  // parserOptions rather than replacing them. Type-aware rules do not run on
  // these five files as a result; they stay on everywhere else.
  {
    files: ["apps/web/tests/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // ——— Vue SFCs ———
  {
    files: ["apps/web/**/*.vue"],
    extends: [
      // `essential` only, not `recommended`: the extra tiers are formatting
      // rules (attribute placement, self-closing tags, line breaks) that fight
      // Prettier. Formatting is Prettier's job; ESLint's is catching bugs.
      ...pluginVue.configs["flat/essential"],
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      // Re-asserted AFTER the tseslint config above: that config sets the TS
      // parser at top level, which stopped vue-eslint-parser from ever seeing
      // the SFC and produced "Parsing error: Type expected" on line 1 of every
      // .vue file. The TS parser still runs, but nested — on the <script>
      // block only, which is what it can actually understand.
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      // Nuxt auto-imports components by filename, so the multi-word convention
      // doesn't apply the way it does in plain Vue.
      "vue/multi-word-component-names": "off",
    },
  },

  // Must come last: turns off every formatting rule that would conflict with
  // Prettier, across all plugins.
  prettierConfig,
);

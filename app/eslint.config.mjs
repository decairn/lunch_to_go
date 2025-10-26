import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const nextConfigs = require("eslint-config-next");
const prettierConfig = require("eslint-config-prettier/flat");

const [nextBase, nextTypescript, nextIgnores] = nextConfigs;

const eslintConfig = [
  {
    ...nextBase,
    plugins: { ...nextBase.plugins },
    languageOptions: {
      ...nextBase.languageOptions,
      parserOptions: {
        ...(nextBase.languageOptions?.parserOptions ?? {}),
      },
      globals: {
        ...(nextBase.languageOptions?.globals ?? {}),
      },
    },
    settings: {
      ...(nextBase.settings ?? {}),
    },
    rules: {
      ...(nextBase.rules ?? {}),
    },
  },
  {
    ...nextTypescript,
    plugins: {
      ...(nextTypescript.plugins ?? {}),
    },
    languageOptions: {
      ...nextTypescript.languageOptions,
      parserOptions: {
        ...(nextTypescript.languageOptions?.parserOptions ?? {}),
      },
    },
  },
  {
    ...nextIgnores,
    ignores: [
      ...(nextIgnores.ignores ?? []),
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  prettierConfig,
];

export default eslintConfig;

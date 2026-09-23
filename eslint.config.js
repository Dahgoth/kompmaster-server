// ESLint flat config (eslint >= 9). Scope:
// - backend/**, scripts/** — CommonJS, Node.js globals
// - frontend/**            — Next.js TypeScript/React (browser + Node configs)
// Real-bug rules only: typescript-eslint recommended, react-hooks, jsx-a11y.
// Style is fully delegated to Prettier (.prettierrc.json) — do not add
// stylistic rules here.

"use strict";

const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const reactHooks = require("eslint-plugin-react-hooks");
const jsxA11y = require("eslint-plugin-jsx-a11y");

// Rule overrides shared by every app config block. Kept in one place so the
// backend and frontend lint the same way (the only exceptions below it are
// the environment-specific blocks).
const sharedRules = {
  "no-empty": ["error", { allowEmptyCatch: true }],
};

// typescript-eslint v8 flat configs are arrays of config objects; flatten the
// rule sections into one object so the shared block style below stays flat.
const tsRecommendedRules = Object.assign(
  {},
  ...tseslint.configs.recommended.map((c) => c.rules ?? {}),
);

module.exports = [
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.next/",
      "docs/",
      "uploads/",
      "terraform/",
      ".kilo/",
    ],
  },

  // Backend (CommonJS) + repo-level tooling scripts
  {
    files: ["backend/**/*.js", "scripts/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // Frontend app code — Next.js TypeScript + React (browser)
  {
    files: [
      "frontend/src/**/*.ts",
      "frontend/src/**/*.tsx",
      "frontend/tests/**/*.ts",
      "frontend/tests/**/*.tsx",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...tsRecommendedRules,
      ...sharedRules,
      // The base rule double-fires on TS files and misreads type-only usage.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...jsxA11y.flatConfigs.recommended.rules,
    },
    settings: { "jsx-a11y": { language: "javascript" } },
  },

  // Frontend build/tool configs run in Node
  {
    files: ["frontend/next.config.ts", "frontend/vitest.config.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      globals: { ...globals.node },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      ...tsRecommendedRules,
      ...sharedRules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

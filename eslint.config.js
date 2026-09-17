// ESLint flat config (eslint >= 9). Scope:
// - backend/**, scripts/** — CommonJS, Node.js globals
// - frontend/**            — ESM, browser globals (vite.config.js gets Node globals)
// Only eslint:recommended-equivalent rules are enabled: this config catches
// real bugs (parse errors, undefined variables, unused vars) while style is
// fully delegated to Prettier (.prettierrc.json). Keep it that way — do not
// add stylistic rules here.
//
// Excluded (ADR 001 legacy quarantine — ESM-syntax files that cannot run
// under the backend's CommonJS runtime; kept frozen, see .prettierignore):
//   backend/src/mail.js, backend/src/auth.js, backend/src/sheets.js,
//   backend/src/payment-adapters/index.js,
//   backend/scripts/init-db.js, backend/scripts/reset-admin.js

"use strict";

const js = require("@eslint/js");
const globals = require("globals");

// Rule overrides shared by every app config block. Kept in one place so the
// backend and frontend lint the same way (the only exceptions below it are
// the environment-specific blocks).
const sharedRules = {
  "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  "no-empty": ["error", { allowEmptyCatch: true }],
};

// ADR 001 legacy quarantine — mirrored in .prettierignore; when adding a
// file here, add it there too.
const legacyBackendFiles = [
  "backend/src/mail.js",
  "backend/src/auth.js",
  "backend/src/sheets.js",
  "backend/src/payment-adapters/index.js",
  "backend/scripts/init-db.js",
  "backend/scripts/reset-admin.js",
];

module.exports = [
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "docs/",
      "uploads/",
      "terraform/",
      ".kilo/",
      ...legacyBackendFiles,
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
    },
  },

  // Frontend storefront (browser ESM)
  {
    files: ["frontend/src/**/*.js", "frontend/tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
    },
  },

  // Vite build config runs in Node
  {
    files: ["frontend/vite.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: { ...js.configs.recommended.rules },
  },
];

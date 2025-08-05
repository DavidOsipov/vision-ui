// eslint.config.js
import globals from "globals";
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import eslintPluginSecurity from "eslint-plugin-security";
import eslintPluginNoUnsanitized from "eslint-plugin-no-unsanitized";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default [
  // Global ignores
  {
    ignores: ["dist/**/*", "node_modules/**/*", "**/*.min.js"],
  },

  // Base configurations for all relevant files
  {
    files: ["**/*.{js,mjs,ts,d.ts}"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        IntersectionObserver: "readonly",
        performance: "readonly",
      },
    },

    plugins: {
      "@typescript-eslint": tseslint,
      security: eslintPluginSecurity,
      "no-unsanitized": eslintPluginNoUnsanitized,
      prettier: eslintPluginPrettier,
    },

    rules: {
      // Base rules
      ...js.configs.recommended.rules,

      // --- Prettier Integration ---
      "prettier/prettier": "error",

      // --- Stricter Core Rules ---
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
      "no-console": ["warn", { allow: ["warn", "error", "info", "debug"] }],
      eqeqeq: ["error", "always"],

      // --- Security Rule Hardening ---
      "security/detect-object-injection": "error",
      "security/detect-non-literal-fs-filename": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",

      // --- TypeScript Specific Rules ---
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "off", // Turn off for JS files
    },
  },
];

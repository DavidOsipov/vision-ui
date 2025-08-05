// eslint.config.js
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint"; // Correct way to import the full plugin object
import eslintPluginSecurity from "eslint-plugin-security";
import eslintPluginNoUnsanitized from "eslint-plugin-no-unsanitized";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier"; // Needed to disable conflicting rules

export default tseslint.config(
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
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node, // Add node globals for things like `process`
        IntersectionObserver: "readonly",
        performance: "readonly",
      },
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
      security: eslintPluginSecurity,
      "no-unsanitized": eslintPluginNoUnsanitized,
      prettier: eslintPluginPrettier,
    },

    rules: {
      // Base recommended rules
      ...js.configs.recommended.rules,
      // Recommended TypeScript rules
      ...tseslint.configs.recommended.rules,
      // Recommended security rules
      ...eslintPluginSecurity.configs.recommended.rules,

      // --- Prettier Integration (must be last) ---
      ...eslintConfigPrettier.rules,
      "prettier/prettier": "error",

      // --- Stricter Core & TS Rules ---
      "no-unused-vars": "off", // Disable base rule, use TS version
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "none", ignoreRestSiblings: true },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info", "debug"] }],
      eqeqeq: ["error", "always"],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },

  // Test files configuration
  {
    files: ["**/*.test.js", "**/*.spec.js", "**/tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.vitest, // Use vitest globals
      },
    },
    rules: {
      // Relax some rules for test files
      "security/detect-object-injection": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
    },
  },
);

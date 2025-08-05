// eslint.config.js
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginSecurity from "eslint-plugin-security";
import eslintPluginNoUnsanitized from "eslint-plugin-no-unsanitized";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "**/*.min.js",
    ],
  },
  
  // Base configurations for all relevant files
  {
    files: ["**/*.{js,mjs,ts,d.ts}"],
    
    // Start with recommended rule sets as a strong baseline
    ...js.configs.recommended,
    ...tseslint.configs.recommended,
    ...eslintPluginSecurity.configs.recommended,
    ...eslintPluginNoUnsanitized.configs.recommended,
    
    // Add Prettier config last to override any conflicting style rules
    eslintConfigPrettier,

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      // Use the TypeScript parser for all files to support modern syntax and type info
      parser: tseslint.parser,
      globals: {
        ...globals.browser, // Enables all standard browser globals
        // Add any other specific globals your project uses
        "IntersectionObserver": "readonly",
        "performance": "readonly",
      },
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "security": eslintPluginSecurity,
      "no-unsanitized": eslintPluginNoUnsanitized,
      "prettier": eslintPluginPrettier,
    },

    rules: {
      // --- Prettier Integration ---
      "prettier/prettier": "error",

      // --- Stricter Core Rules ---
      "no-unused-vars": "off", // Disabled in favor of the TypeScript version
      "@typescript-eslint/no-unused-vars": ["warn", { "args": "none" }],
      "no-console": ["warn", { "allow": ["warn", "error", "info", "debug"] }],
      "eqeqeq": ["error", "always"],

      // --- Security Rule Hardening ---
      // Upgrade warnings from the recommended set to errors for a stricter policy
      "security/detect-object-injection": "error",
      "security/detect-non-literal-fs-filename": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      
      // --- TypeScript Specific Rules ---
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error for initial adoption
      "@typescript-eslint/consistent-type-imports": "error",
    },
  }
);

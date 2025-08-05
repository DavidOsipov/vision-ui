// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Add this line to run your setup file
    setupFiles: ["tests/setup.js"],
    include: ["tests/**/*.test.js", "**/?(*.)+(spec|test).js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/**/*.d.ts"],
    },
  },
});

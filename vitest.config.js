import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.js", "**/?(*.)+(spec|test).js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/**/*.d.ts"],
    },
  },
});

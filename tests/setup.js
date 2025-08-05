// tests/setup.js
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 David Osipov <personal@david-osipov.vision>

/**
 * Vitest global setup file for the security-kit module tests.
 * This file is executed once before the test suite runs.
 * It handles the global mocking of the Web Crypto API.
 */

import { vi } from "vitest";

// This is the single, consistent mock object used across all tests.
const mockCrypto = {
  getRandomValues: vi.fn((array) => {
    // Fill the array with predictable, non-zero values for testing.
    for (let i = 0; i < array.length; i++) {
      // This is safe in a test context where the array is always a TypedArray.
      array[i] = (i + 1) * 10;
    }
    return array;
  }),
  randomUUID: vi.fn(() => "mock-uuid-v4-from-crypto-api"),
};

// Mock the 'node:crypto' module. This must be at the top level.
// When any test file imports from 'node:crypto', it will get this mock.
vi.mock("node:crypto", () => ({
  webcrypto: mockCrypto,
}));

// Use Object.defineProperty to override the read-only globalThis.crypto property.
// This ensures that code checking for the global crypto object finds our mock.
Object.defineProperty(globalThis, "crypto", {
  value: mockCrypto,
  writable: true,
  configurable: true,
});

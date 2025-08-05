// SPDX-License-Identifier: MIT
// Copyright (c) 2025 David Osipov <personal@david-osipov.vision>

/**
 * Vitest setup file for the security-kit module tests.
 * Handles crypto API mocking in a way that works with Node.js environment.
 */

import { vi } from "vitest";

// Mock the crypto module at the module level
const mockCrypto = {
  getRandomValues: vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = (i + 1) * 10;
    }
    return array;
  }),
  randomUUID: vi.fn(() => "mock-uuid-v4-from-crypto-api"),
};

// Store originals
const originalCrypto = globalThis.crypto;
const originalWebcrypto = globalThis.webcrypto;

// Use Object.defineProperty to override the read-only crypto property
Object.defineProperty(globalThis, "crypto", {
  value: mockCrypto,
  writable: true,
  configurable: true,
});

// Mock the node:crypto module
vi.mock("node:crypto", () => ({
  webcrypto: mockCrypto,
}));

// Export for use in tests
export { mockCrypto, originalCrypto, originalWebcrypto };

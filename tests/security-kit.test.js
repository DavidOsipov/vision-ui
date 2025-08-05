// tests/security-kit.test.js
/**
 * @vitest-environment node
 *
 * The definitive, utmostly comprehensive test suite for the 'security-kit' module.
 *
 * This suite represents a synthesis of best practices, incorporating not only
 * standard unit and integration tests but also advanced security, performance,
 * and adversarial testing methodologies. It is structured to provide maximum
 * confidence in the library's correctness, robustness, and security posture.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { webcrypto } from "node:crypto";

// The mocked crypto object from our global setup file.
const mockCrypto = webcrypto;

// Import the module to be tested.
import securityKitDefault, * as securityKit from "../src/security-kit.js";

const {
  CryptoUnavailableError,
  InvalidParameterError,
  generateSecureId,
  generateSecureIdSync,
  generateSecureUUID,
  getSecureRandomInt,
  getSecureRandomAsync,
  getSecureRandom,
  shouldExecuteThrottledAsync,
  shouldExecuteThrottled,
} = securityKit;

// Helper function for statistical analysis.
function chiSquaredTest(observed, totalObservations) {
  const categories = Object.keys(observed);
  const numCategories = categories.length;
  const expected = totalObservations / numCategories;
  const df = numCategories - 1;
  const criticalValues = {
    1: 3.84,
    2: 5.99,
    3: 7.81,
    4: 9.49,
    5: 11.07,
    9: 16.92,
    15: 25.0,
  };
  const criticalValue = criticalValues[df];
  if (!criticalValue)
    throw new Error(`No critical value for ${df} degrees of freedom.`);
  let chiSquaredStatistic = 0;
  for (const category of categories) {
    chiSquaredStatistic += (observed[category] - expected) ** 2 / expected;
  }
  return chiSquaredStatistic < criticalValue;
}

// --- Test Suite ---

describe("security-kit", () => {
  // The mock implementation is preserved from the setup file.
  // We only need to clear call history before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Error Classes", () => {
    it("CryptoUnavailableError has correct name and default/custom messages", () => {
      const defaultErr = new CryptoUnavailableError();
      expect(defaultErr).toBeInstanceOf(Error);
      expect(defaultErr.name).toBe("CryptoUnavailableError");
      expect(defaultErr.message).toMatch(
        /\[secure-helpers\] A compliant Web Crypto API is not available/,
      );
      const customErr = new CryptoUnavailableError("test");
      expect(customErr.message).toBe("[secure-helpers] test");
    });

    it("InvalidParameterError has correct name and message format", () => {
      const err = new InvalidParameterError("param");
      expect(err).toBeInstanceOf(RangeError);
      expect(err.name).toBe("InvalidParameterError");
      expect(err.message).toBe("[secure-helpers] param");
    });
  });

  describe("Crypto API Discovery and Resilience", () => {
    it("should use the mocked crypto API", async () => {
      await generateSecureId();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
    });

    it("should throw CryptoUnavailableError when no API is found", async () => {
      // Use `vi.resetModules` and dynamic import to test module initialization logic.
      vi.resetModules();
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        configurable: true,
      });
      vi.doMock("node:crypto", () => ({ webcrypto: undefined }));

      const freshKit = await import("../src/security-kit.js");
      await expect(freshKit.generateSecureId()).rejects.toThrow(
        CryptoUnavailableError,
      );

      // Restore for other tests
      vi.doUnmock("node:crypto");
      vi.resetModules();
    });

    it("should propagate underlying errors from a faulty crypto.getRandomValues", async () => {
      const hardwareError = new Error("Crypto hardware failure");
      mockCrypto.getRandomValues.mockImplementation(() => {
        throw hardwareError;
      });
      await expect(generateSecureId()).rejects.toThrow(hardwareError);
    });
  });

  describe.each([
    ["generateSecureId", generateSecureId, true],
    ["generateSecureIdSync", generateSecureIdSync, false],
  ])("%s", (name, func, isAsync) => {
    const run = (arg) => (isAsync ? func(arg) : Promise.resolve(func(arg)));

    it("should generate an ID of the default length (12)", async () => {
      const id = await run();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[0-9a-f]{12}$/);
    });

    it("should handle boundary lengths 1 and 1024", async () => {
      expect(await run(1)).toHaveLength(1);
      expect(await run(1024)).toHaveLength(1024);
    });

    it("should correctly handle odd lengths by slicing", async () => {
      mockCrypto.getRandomValues.mockImplementation((arr) => arr.fill(0xab));
      expect(await run(3)).toBe("aba");
    });

    it("should throw InvalidParameterError for a wide range of invalid types", async () => {
      const invalidInputs = [
        0,
        1025,
        null,
        undefined,
        NaN,
        Infinity,
        [],
        {},
        "string",
        true,
      ];
      for (const input of invalidInputs) {
        if (isAsync) {
          await expect(func(input)).rejects.toThrow(InvalidParameterError);
        } else {
          expect(() => func(input)).toThrow(InvalidParameterError);
        }
      }
    });
  });

  describe("generateSecureUUID", () => {
    const UUID_V4_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it("should use crypto.randomUUID when available", async () => {
      const uuid = await generateSecureUUID();
      expect(uuid).toBe("mock-uuid-v4-from-crypto-api");
      expect(mockCrypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it("should set RFC 4122 version and variant bits correctly in fallback", async () => {
      mockCrypto.randomUUID = undefined;
      mockCrypto.getRandomValues.mockImplementation((arr) =>
        arr.fill(0b11111111),
      );
      const uuid = await generateSecureUUID();
      expect(uuid).toMatch(UUID_V4_REGEX);
      expect(uuid[14]).toBe("4");
      expect(["8", "9", "a", "b"]).toContain(uuid[19]);
      // Restore for other tests
      mockCrypto.randomUUID = vi.fn(() => "mock-uuid-v4-from-crypto-api");
    });
  });

  describe("getSecureRandomInt", () => {
    it("should return an integer within the specified range", async () => {
      const result = await getSecureRandomInt(1, 100);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should use rejection sampling to prevent modulo bias", async () => {
      const min = 0,
        max = 20;
      mockCrypto.getRandomValues
        .mockImplementationOnce((arr) => ((arr[0] = 25), arr))
        .mockImplementationOnce((arr) => ((arr[0] = 10), arr));
      const result = await getSecureRandomInt(min, max);
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
      expect(result).toBe(10);
    });

    it("should produce a uniform distribution (passes Chi-squared test)", async () => {
      // Use `vi.importActual` to get the real crypto implementation, bypassing the global mock.
      const { webcrypto: realCrypto } = await vi.importActual("node:crypto");
      if (!realCrypto)
        throw new Error("Could not load real crypto for statistical test");

      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
      });

      const min = 0,
        max = 5,
        iterations = 6000;
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (let i = 0; i < iterations; i++) {
        counts[await getSecureRandomInt(min, max)]++;
      }
      expect(chiSquaredTest(counts, iterations)).toBe(true);

      // Restore the mock for other tests
      Object.defineProperty(globalThis, "crypto", {
        value: mockCrypto,
        configurable: true,
      });
    });
  });

  describe.each([
    ["getSecureRandomAsync", getSecureRandomAsync, true],
    ["getSecureRandom", getSecureRandom, false],
  ])("%s", (name, func, isAsync) => {
    const run = () => (isAsync ? func() : Promise.resolve(func()));

    it("should use high precision (64-bit) path when available", async () => {
      const spy = vi.spyOn(mockCrypto, "getRandomValues");
      await run();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(BigUint64Array);
    });

    it("should use fallback (32-bit) path when BigUint64Array is NOT available", async () => {
      const originalBigUint64Array = globalThis.BigUint64Array;
      globalThis.BigUint64Array = undefined;
      const spy = vi.spyOn(mockCrypto, "getRandomValues");
      await run();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Uint32Array);
      globalThis.BigUint64Array = originalBigUint64Array;
    });
  });

  describe.each([
    ["shouldExecuteThrottledAsync", shouldExecuteThrottledAsync, true],
    ["shouldExecuteThrottled", shouldExecuteThrottled, false],
  ])("%s", (name, func, isAsync) => {
    const run = (arg) => (isAsync ? func(arg) : Promise.resolve(func(arg)));

    it("should return deterministically based on the underlying random number", async () => {
      const spy = vi.spyOn(
        securityKit,
        isAsync ? "getSecureRandomAsync" : "getSecureRandom",
      );
      spy.mockResolvedValue(0.49);
      await expect(run(0.5)).resolves.toBe(true);
      spy.mockResolvedValue(0.5);
      await expect(run(0.5)).resolves.toBe(false);
      spy.mockRestore();
    });
  });

  // Group tests that depend on `process.env` to manage state cleanly.
  describe("Environment-dependent logic", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    // Restore the original environment and reset modules after each test in this suite.
    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      vi.resetModules();
    });

    it("should correctly identify development via NODE_ENV", async () => {
      process.env.NODE_ENV = "development";
      // The module cache must be reset *before* the dynamic import.
      vi.resetModules();
      const { environment } = await import("../src/security-kit.js");
      expect(environment.isDevelopment).toBe(true);
    });

    it("should correctly identify production via NODE_ENV", async () => {
      process.env.NODE_ENV = "production";
      vi.resetModules();
      const { environment } = await import("../src/security-kit.js");
      expect(environment.isProduction).toBe(true);
    });

    it("should not be vulnerable to prototype pollution in dev logs", async () => {
      process.env.NODE_ENV = "development"; // Ensure logging is on
      vi.resetModules(); // Get a fresh module that reads the new env
      const { secureDevLog } = await import("../src/security-kit.js");

      // Temporarily modify global state for this test
      const originalDocument = globalThis.document;
      globalThis.document = undefined; // Force console logging path

      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}}');
      secureDevLog("info", "test", "message", maliciousPayload);
      expect({}.polluted).toBeUndefined();

      // Clean up global state
      globalThis.document = originalDocument;
    });
  });

  describe("Advanced Security and Resource Testing", () => {
    it("should handle concurrent access without race conditions", async () => {
      // Use `vi.importActual` to get the real crypto implementation for a genuine concurrency test.
      const { webcrypto: realCrypto } = await vi.importActual("node:crypto");
      if (!realCrypto)
        throw new Error("Could not load real crypto for concurrency test");

      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
      });

      const promises = Array(100)
        .fill(0)
        .map(() => generateSecureId(16));
      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);

      // Restore the mock for other tests
      Object.defineProperty(globalThis, "crypto", {
        value: mockCrypto,
        configurable: true,
      });
    });
  });
});

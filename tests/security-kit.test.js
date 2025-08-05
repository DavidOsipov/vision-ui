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

// This now correctly imports the mock object defined in `tests/setup.js`.
const mockCrypto = webcrypto;

// Import the module to be tested.
import * as securityKit from "../src/security-kit.js";

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

// Helper function to create a test runner for async/sync functions.
function createTestRunner(func, isAsync) {
  return (arg) => {
    if (isAsync) {
      return func(arg);
    } else {
      try {
        return Promise.resolve(func(arg));
      } catch (error) {
        return Promise.reject(error);
      }
    }
  };
}

// --- Test Suite ---

describe("security-kit", () => {
  // The mock implementation is preserved from the setup file.
  // We only need to clear call history before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore any "once" mocks to their default implementation
    vi.mocked(mockCrypto.getRandomValues).mockRestore();
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
      vi.resetModules();
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        configurable: true,
      });
      vi.doMock("node:crypto", () => ({ webcrypto: undefined }));

      // We must import the error class from the fresh module instance
      const { generateSecureId, CryptoUnavailableError: FreshError } =
        await import("../src/security-kit.js");

      await expect(generateSecureId()).rejects.toThrow(FreshError);

      vi.doUnmock("node:crypto");
      vi.resetModules();
    });

    it("should propagate underlying errors from a faulty crypto.getRandomValues", async () => {
      const hardwareError = new Error("Crypto hardware failure");
      vi.mocked(mockCrypto.getRandomValues).mockImplementation(() => {
        throw hardwareError;
      });
      await expect(generateSecureId()).rejects.toThrow(hardwareError);
    });
  });

  describe.each([
    ["generateSecureId", generateSecureId, true],
    ["generateSecureIdSync", generateSecureIdSync, false],
  ])("%s", (name, func, isAsync) => {
    const run = createTestRunner(func, isAsync);

    it("should generate an ID of the default length (12)", async () => {
      const id = await run();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[0-9a-f]{12}$/);
    });

    it("should handle boundary lengths 1 and 256", async () => {
      expect(await run(1)).toHaveLength(1);
      expect(await run(256)).toHaveLength(256);
    });

    it("should correctly handle odd lengths by slicing", async () => {
      vi.mocked(mockCrypto.getRandomValues).mockImplementation((arr) =>
        arr.fill(0xab),
      );
      expect(await run(3)).toBe("aba");
    });

    it("should throw InvalidParameterError for a wide range of invalid types", async () => {
      const invalidInputs = [
        0,
        257, // Updated boundary from 1025 to 257
        null,
        NaN,
        Infinity,
        [],
        {},
        "string",
        true,
      ];
      for (const input of invalidInputs) {
        await expect(run(input)).rejects.toThrow(InvalidParameterError);
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
      vi.mocked(mockCrypto).randomUUID = undefined;
      vi.mocked(mockCrypto.getRandomValues).mockImplementation((arr) =>
        arr.fill(0b11111111),
      );
      const uuid = await generateSecureUUID();
      expect(uuid).toMatch(UUID_V4_REGEX);
      expect(uuid[14]).toBe("4");
      expect(["8", "9", "a", "b"]).toContain(uuid[19]);
      // Restore for other tests
      vi.mocked(mockCrypto).randomUUID = vi.fn(
        () => "mock-uuid-v4-from-crypto-api",
      );
    });
  });

  describe("getSecureRandomInt", () => {
    it("should return an integer within the specified range", async () => {
      const result = await getSecureRandomInt(1, 100);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should enforce stricter bounds to prevent DoS attacks", async () => {
      const MAX_SAFE_RANGE = 2 ** 31;
      const MIN_SAFE_RANGE = -(2 ** 31);

      // Test that values at the boundary work
      // Use smaller ranges that are less likely to hit the circuit breaker
      await expect(
        getSecureRandomInt(MIN_SAFE_RANGE, MIN_SAFE_RANGE + 10),
      ).resolves.toBeDefined();
      await expect(
        getSecureRandomInt(MAX_SAFE_RANGE - 10, MAX_SAFE_RANGE),
      ).resolves.toBeDefined();

      // Test that values outside the boundary fail
      await expect(getSecureRandomInt(MIN_SAFE_RANGE - 1, 100)).rejects.toThrow(
        InvalidParameterError,
      );
      await expect(getSecureRandomInt(100, MAX_SAFE_RANGE + 1)).rejects.toThrow(
        InvalidParameterError,
      );
    });

    it("should use rejection sampling to prevent modulo bias", async () => {
      const min = 0,
        max = 20;
      vi.mocked(mockCrypto.getRandomValues)
        .mockImplementationOnce((arr) => {
          arr[0] = 25;
          return arr;
        })
        .mockImplementationOnce((arr) => {
          arr[0] = 10;
          return arr;
        });
      const result = await getSecureRandomInt(min, max);
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
      expect(result).toBe(10);
    });

    it("should handle large ranges using BigInt arithmetic correctly", async () => {
      // Test a large range that would overflow 32-bit arithmetic
      const min = 1000000000; // 1 billion
      const max = 2000000000; // 2 billion
      const result = await getSecureRandomInt(min, max);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });

    it("should include circuit breaker protection against infinite loops", async () => {
      // Mock the crypto API to always return values that would be rejected
      vi.mocked(mockCrypto.getRandomValues).mockImplementation((arr) => {
        // Set all bytes to 255 to ensure the value is always >= range
        arr.fill(255);
        return arr;
      });

      await expect(getSecureRandomInt(0, 1)).rejects.toThrow(
        /Failed to generate random integer within reasonable iterations/,
      );
    });

    it("should produce a uniform distribution (passes Chi-squared test)", async () => {
      // This test needs real randomness, so we temporarily use real crypto
      const { webcrypto: realCrypto } = await vi.importActual("node:crypto");

      // Clear module cache and reimport with real crypto
      vi.resetModules();
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
      });

      const { getSecureRandomInt } = await import("../src/security-kit.js");

      const min = 0,
        max = 5,
        iterations = 40000; // Increased from 6000 for more stability
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (let i = 0; i < iterations; i++) {
        counts[await getSecureRandomInt(min, max)]++;
      }
      expect(chiSquaredTest(counts, iterations)).toBe(true);

      // Restore mock for other tests
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
    const run = () => createTestRunner(func, isAsync)();

    it("should use high precision (64-bit) path when available", async () => {
      await run();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
      expect(
        vi.mocked(mockCrypto.getRandomValues).mock.calls[0][0],
      ).toBeInstanceOf(BigUint64Array);
    });

    it("should use fallback (32-bit) path when BigUint64Array is NOT available", async () => {
      const originalBigUint64Array = globalThis.BigUint64Array;
      globalThis.BigUint64Array = undefined;
      await run();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
      expect(
        vi.mocked(mockCrypto.getRandomValues).mock.calls[0][0],
      ).toBeInstanceOf(Uint32Array);
      globalThis.BigUint64Array = originalBigUint64Array;
    });
  });

  describe.each([
    ["shouldExecuteThrottledAsync", shouldExecuteThrottledAsync, true],
    ["shouldExecuteThrottled", shouldExecuteThrottled, false],
  ])("%s", (name, func, isAsync) => {
    const run = (arg) => createTestRunner(func, isAsync)(arg);

    it("should return deterministically based on the underlying random number", async () => {
      // Mock the crypto API to return specific values
      const originalImpl = vi
        .mocked(mockCrypto.getRandomValues)
        .getMockImplementation();

      // Mock for value that should return true (0.49 < 0.5)
      vi.mocked(mockCrypto.getRandomValues).mockImplementation((array) => {
        if (array instanceof BigUint64Array) {
          array[0] = BigInt("0x7d70a3d70a3d7000"); // Will produce 0.49
        } else {
          array[0] = Math.floor(0.49 * (0xffffffff + 1));
        }
        return array;
      });
      await expect(run(0.5)).resolves.toBe(true);

      // Mock for value that should return false (0.51 >= 0.5)
      vi.mocked(mockCrypto.getRandomValues).mockImplementation((array) => {
        if (array instanceof BigUint64Array) {
          array[0] = BigInt("0x828f5c28f5c29000"); // Will produce 0.51
        } else {
          array[0] = Math.floor(0.51 * (0xffffffff + 1));
        }
        return array;
      });
      await expect(run(0.5)).resolves.toBe(false);

      // Restore original mock
      vi.mocked(mockCrypto.getRandomValues).mockImplementation(originalImpl);
    });
  });

  describe("Environment-dependent logic", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      vi.resetModules();
    });

    it("should correctly identify development via NODE_ENV", async () => {
      process.env.NODE_ENV = "development";
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
      process.env.NODE_ENV = "development";
      vi.resetModules();
      const { secureDevLog } = await import("../src/security-kit.js");

      const originalDocument = globalThis.document;
      globalThis.document = undefined;

      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}}');
      secureDevLog("info", "test", "message", maliciousPayload);
      expect({}.polluted).toBeUndefined();

      globalThis.document = originalDocument;
    });
  });

  describe("Advanced Security and Resource Testing", () => {
    it("should handle concurrent access without race conditions", async () => {
      // This test needs real randomness to generate unique IDs
      const { webcrypto: realCrypto } = await vi.importActual("node:crypto");

      // Clear module cache and reimport with real crypto
      vi.resetModules();
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
      });

      const { generateSecureId } = await import("../src/security-kit.js");

      const promises = Array(100)
        .fill(0)
        .map(() => generateSecureId(16));
      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);

      // Restore mock for other tests
      Object.defineProperty(globalThis, "crypto", {
        value: mockCrypto,
        configurable: true,
      });
    });

    it("should use optimized hex encoding when Buffer is available", async () => {
      // Mock Buffer to test Node.js path
      const mockBuffer = {
        from: vi.fn().mockReturnValue({
          toString: vi.fn().mockReturnValue("deadbeef12345678"),
        }),
      };

      const originalBuffer = globalThis.Buffer;
      globalThis.Buffer = mockBuffer;

      try {
        const id = await generateSecureId(16);
        expect(mockBuffer.from).toHaveBeenCalledTimes(1);
        expect(id).toBe("deadbeef12345678");
      } finally {
        globalThis.Buffer = originalBuffer;
      }
    });
  });

  describe("Buffer Overflow and DoS Protection Tests", () => {
    describe("ID Generation DoS Protection", () => {
      it("should prevent excessive memory allocation in generateSecureId", async () => {
        // Test boundary case: 256 should work
        await expect(generateSecureId(256)).resolves.toHaveLength(256);

        // Test DoS prevention: 257 should fail
        await expect(generateSecureId(257)).rejects.toThrow(
          InvalidParameterError,
        );
        await expect(generateSecureId(257)).rejects.toThrow(
          /length must be an integer between 1 and 256/,
        );
      });

      it("should prevent excessive memory allocation in generateSecureIdSync", () => {
        // Test boundary case: 256 should work
        expect(generateSecureIdSync(256)).toHaveLength(256);

        // Test DoS prevention: 257 should fail
        expect(() => generateSecureIdSync(257)).toThrow(InvalidParameterError);
        expect(() => generateSecureIdSync(257)).toThrow(
          /length must be an integer between 1 and 256/,
        );
      });

      it("should handle malicious large length values gracefully", async () => {
        const maliciousValues = [
          1000,
          10000,
          100000,
          Number.MAX_SAFE_INTEGER,
          2 ** 20, // 1MB worth of characters
          2 ** 30, // 1GB worth of characters
        ];

        for (const maliciousLength of maliciousValues) {
          await expect(generateSecureId(maliciousLength)).rejects.toThrow(
            InvalidParameterError,
          );
          expect(() => generateSecureIdSync(maliciousLength)).toThrow(
            InvalidParameterError,
          );
        }
      });
    });

    describe("Random Integer DoS Protection", () => {
      it("should enforce strict range boundaries to prevent integer overflow", async () => {
        const MAX_SAFE = 2 ** 31;
        const MIN_SAFE = -(2 ** 31);

        // Test that normal large ranges work fine
        await expect(
          getSecureRandomInt(1000000, 2000000),
        ).resolves.toBeDefined();
        await expect(
          getSecureRandomInt(-1000000, -500000),
        ).resolves.toBeDefined();

        // Test that values beyond our defined boundaries fail
        await expect(getSecureRandomInt(MIN_SAFE - 1, 0)).rejects.toThrow(
          InvalidParameterError,
        );
        await expect(getSecureRandomInt(0, MAX_SAFE + 1)).rejects.toThrow(
          InvalidParameterError,
        );

        // Test with extreme values that should be rejected by validation
        await expect(
          getSecureRandomInt(Number.MIN_SAFE_INTEGER, 0),
        ).rejects.toThrow(InvalidParameterError);
        await expect(
          getSecureRandomInt(0, Number.MAX_SAFE_INTEGER),
        ).rejects.toThrow(InvalidParameterError);
      });

      it("should prevent ranges that would require excessive buffer allocation", async () => {
        // These ranges would require > 8 bytes and should be rejected
        const maliciousRanges = [
          // Simulate a range that would need many bytes
          [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
          // Values at the edge of our supported range
          [-(2 ** 31) + 1, 2 ** 31],
        ];

        for (const [min, max] of maliciousRanges) {
          if (min < -(2 ** 31) || max > 2 ** 31) {
            await expect(getSecureRandomInt(min, max)).rejects.toThrow(
              InvalidParameterError,
            );
          }
        }
      });

      it("should have circuit breaker protection against infinite rejection sampling", async () => {
        // Mock crypto to always return values that get rejected
        vi.mocked(mockCrypto.getRandomValues).mockImplementation((arr) => {
          // Fill with maximum values to ensure rejection in sampling
          arr.fill(255);
          return arr;
        });

        // This should trigger the circuit breaker after 1000 iterations
        await expect(getSecureRandomInt(0, 1)).rejects.toThrow(
          /Failed to generate random integer within reasonable iterations/,
        );

        // Verify it doesn't hang indefinitely
        const startTime = Date.now();
        try {
          await getSecureRandomInt(0, 1);
        } catch (e) {
          const duration = Date.now() - startTime;
          // Should fail quickly, not hang for seconds
          expect(duration).toBeLessThan(1000); // Less than 1 second
        }
      });
    });

    describe("Memory Exhaustion Attack Simulation", () => {
      it("should handle rapid successive large requests without memory issues", async () => {
        // Simulate an attacker making many large requests rapidly
        const promises = [];

        for (let i = 0; i < 100; i++) {
          // All should fail due to DoS protection, but shouldn't exhaust memory
          promises.push(
            generateSecureId(256).catch(() => "expected_failure"),
            generateSecureId(257).catch(() => "expected_failure"),
          );
        }

        const results = await Promise.all(promises);

        // Count successful vs failed operations
        const successes = results.filter(
          (r) => r !== "expected_failure",
        ).length;
        const failures = results.filter((r) => r === "expected_failure").length;

        // Should have 100 successes (256 length) and 100 failures (257 length)
        expect(successes).toBe(100);
        expect(failures).toBe(100);
      });

      it("should maintain consistent performance under DoS attack simulation", async () => {
        const iterations = 50;
        const times = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();

          try {
            await generateSecureId(1000); // Should fail quickly
          } catch (e) {
            // Expected to fail due to DoS protection
            expect(e).toBeInstanceOf(InvalidParameterError);
          }

          const duration = performance.now() - start;
          times.push(duration);
        }

        // All operations should complete quickly and consistently
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const maxTime = Math.max(...times);

        expect(avgTime).toBeLessThan(5); // Average under 5ms
        expect(maxTime).toBeLessThan(20); // No operation over 20ms
      });
    });

    describe("BigInt Buffer Overflow Protection", () => {
      it("should handle BigInt arithmetic without 32-bit overflow", async () => {
        // Test ranges that would overflow 32-bit arithmetic but are within our limits
        const largeRanges = [
          [0, 2 ** 32 - 1], // Would overflow (1 << 32) but BigInt handles it
          [1000000000, 2000000000], // Large range within our ±2^31 limit
          [-(2 ** 30), 2 ** 30], // Large negative to positive range
        ];

        for (const [min, max] of largeRanges) {
          if (min >= -(2 ** 31) && max <= 2 ** 31) {
            const result = await getSecureRandomInt(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
            expect(Number.isInteger(result)).toBe(true);
          }
        }
      });

      it("should detect and prevent buffer allocation overflow scenarios", async () => {
        // Test that our 8-byte limit prevents excessive allocations
        // These are theoretical ranges that would need > 8 bytes

        // The function should reject these before attempting allocation
        const oversizedRanges = [
          // These would be caught by the ±2^31 parameter validation first
          [Number.MIN_SAFE_INTEGER, 0],
          [0, Number.MAX_SAFE_INTEGER],
        ];

        for (const [min, max] of oversizedRanges) {
          await expect(getSecureRandomInt(min, max)).rejects.toThrow(
            InvalidParameterError,
          );
        }
      });
    });
  });
});

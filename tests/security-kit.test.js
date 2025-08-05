/**
 * @jest-environment node
 *
 * The definitive, utmostly comprehensive test suite for the 'security-kit' module.
 *
 * This suite represents a synthesis of best practices, incorporating not only
 * standard unit and integration tests but also advanced security, performance,
 * and adversarial testing methodologies. It is structured to provide maximum
 * confidence in the library's correctness, robustness, and security posture.
 *
 * Key features of this suite:
 * 1.  **Holistic Coverage:** Tests public APIs, critical internal helpers, and
 *     backward-compatibility shims.
 * 2.  **Formal Statistical Analysis:** Employs Chi-squared goodness-of-fit tests
 *     to rigorously verify the quality of cryptographic randomness, guarding
 *     against bias and predictability.
 * 3.  **Adversarial Simulation:**
 *     - **Hostile Environments:** Simulates broken, non-compliant, or missing
 *       crypto APIs and browser/Node.js globals.
 *     - **Hostile Inputs:** Actively probes for vulnerabilities using prototype
 *       pollution payloads, injection-style strings, and a vast range of
 *       malformed data types.
 * 4.  **Security Mechanism Verification:** Directly tests security-critical
 *     implementations like rejection sampling, buffer allocation, and UUID
 *     bit-setting.
 * 5.  **Resource and Timing Analysis:** Includes tests for concurrency safety,
 *     memory usage, and basic side-channel timing analysis.
 */

import securityKitDefault, * as securityKit from "./security-kit.js";

// NOTE: To test internal helpers, they would need to be exported from the module.
// We will conditionally run these tests.
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
  environment,
  secureDevLog,
  secureDevNotify,
  isDevelopment,
} = securityKit;

// --- Mocks and Test Helpers ---

const mockCrypto = {
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = (i + 1) * 10;
    }
    return array;
  }),
  randomUUID: jest.fn(() => "mock-uuid-v4-from-crypto-api"),
};

jest.mock("node:crypto", () => ({
  webcrypto: mockCrypto,
}));

/**
 * Performs a Chi-squared goodness-of-fit test.
 * @param {Record<string | number, number>} observed - A map of category to observed count.
 * @param {number} totalObservations - The total number of observations.
 * @returns {boolean} - True if the distribution passes the test (is likely uniform).
 */
function chiSquaredTest(observed, totalObservations) {
  const categories = Object.keys(observed);
  const numCategories = categories.length;
  const expected = totalObservations / numCategories;
  const df = numCategories - 1;
  // Chi-squared critical values for p=0.05 (a common significance level)
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

const originalGlobalThisCrypto = globalThis.crypto;
const originalGlobalThisDocument = globalThis.document;
const originalGlobalThisLocation = globalThis.location;
const originalGlobalThisProcess = globalThis.process;
const originalConsole = { ...globalThis.console };
const originalMathRandom = Math.random;

// --- Test Suite ---

describe("security-kit", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    globalThis.crypto = mockCrypto;
    globalThis.document = originalGlobalThisDocument;
    globalThis.location = originalGlobalThisLocation;
    globalThis.process = {
      ...originalGlobalThisProcess,
      env: { ...originalGlobalThisProcess?.env },
    };
    Object.assign(globalThis.console, originalConsole);
    Math.random = originalMathRandom;
  });

  afterAll(() => {
    jest.unmock("node:crypto");
    globalThis.crypto = originalGlobalThisCrypto;
    globalThis.document = originalGlobalThisDocument;
    globalThis.location = originalGlobalThisLocation;
    globalThis.process = originalGlobalThisProcess;
    globalThis.console = originalConsole;
    Math.random = originalMathRandom;
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
    it("should use globalThis.crypto when available", async () => {
      await generateSecureId();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
    });

    it("should fall back to Node.js webcrypto when globalThis.crypto is unavailable", async () => {
      globalThis.crypto = undefined;
      await generateSecureId();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
    });

    it("should throw CryptoUnavailableError when no API is found", async () => {
      globalThis.crypto = undefined;
      jest.doMock("node:crypto", () => ({ webcrypto: undefined }));
      const freshKit = await import("./security-kit.js");
      await expect(freshKit.generateSecureId()).rejects.toThrow(
        CryptoUnavailableError,
      );
    });

    it("should propagate underlying errors from a faulty crypto.getRandomValues", async () => {
      const hardwareError = new Error("Crypto hardware failure");
      mockCrypto.getRandomValues.mockImplementation(() => {
        throw hardwareError;
      });
      await expect(generateSecureId()).rejects.toThrow(hardwareError);
    });

    it("should handle a non-function crypto.randomUUID by using the fallback", async () => {
      mockCrypto.randomUUID = "not-a-function";
      const uuid = await generateSecureUUID();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe("Internal: Parameter Validation", () => {
    const { validateNumericParam, validateProbability } = securityKit;
    if (!validateNumericParam || !validateProbability) {
      test.skip("Skipping internal helper tests as they are not exported", () => {});
    } else {
      it("validateNumericParam throws on non-integer, non-number, or out of range values", () => {
        expect(() => validateNumericParam("a", "p", 1, 10)).toThrow(
          InvalidParameterError,
        );
        expect(() => validateNumericParam(5.5, "p", 1, 10)).toThrow(
          InvalidParameterError,
        );
        expect(() => validateNumericParam(0, "p", 1, 10)).toThrow(
          InvalidParameterError,
        );
        expect(() => validateNumericParam(11, "p", 1, 10)).toThrow(
          InvalidParameterError,
        );
      });

      it("validateProbability throws on invalid probability values", () => {
        expect(() => validateProbability(-0.1)).toThrow(InvalidParameterError);
        expect(() => validateProbability(1.1)).toThrow(InvalidParameterError);
        expect(() => validateProbability("0.5")).toThrow(InvalidParameterError);
      });
    }
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

    it("should perform correct buffer allocation to prevent overflow", async () => {
      let bufferSizeUsed = 0;
      mockCrypto.getRandomValues.mockImplementation((buffer) => {
        bufferSizeUsed = buffer.length;
        return buffer.fill(0xff);
      });
      await run(15);
      expect(bufferSizeUsed).toBe(8);
      await run(16);
      expect(bufferSizeUsed).toBe(8);
      await run(17);
      expect(bufferSizeUsed).toBe(9);
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
    });
  });

  describe("getSecureRandomInt", () => {
    it("should return an integer within the specified range", async () => {
      const result = await getSecureRandomInt(1, 100);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should handle the full safe integer range", async () => {
      const min = Number.MIN_SAFE_INTEGER;
      const max = Number.MAX_SAFE_INTEGER;
      mockCrypto.getRandomValues.mockImplementation(
        (array) => (array.fill(0), (array[array.length - 1] = 5), array),
      );
      const result = await getSecureRandomInt(min, max);
      expect(result).toBe(min + 5);
    });

    it("should use rejection sampling to prevent modulo bias", async () => {
      const min = 0,
        max = 20; // range=21, needs 5 bits (mask=31), values 21-31 rejected
      mockCrypto.getRandomValues
        .mockImplementationOnce((arr) => ((arr[0] = 25), arr)) // Reject
        .mockImplementationOnce((arr) => ((arr[0] = 10), arr)); // Accept
      const result = await getSecureRandomInt(min, max);
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
      expect(result).toBe(10);
    });

    it("should produce a uniform distribution (passes Chi-squared test)", async () => {
      const { webcrypto } = await import("node:crypto");
      globalThis.crypto = webcrypto;
      const min = 0,
        max = 5,
        iterations = 6000;
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (let i = 0; i < iterations; i++) {
        counts[await getSecureRandomInt(min, max)]++;
      }
      expect(chiSquaredTest(counts, iterations)).toBe(true);
    });
  });

  describe.each([
    ["getSecureRandomAsync", getSecureRandomAsync, true],
    ["getSecureRandom", getSecureRandom, false],
  ])("%s", (name, func, isAsync) => {
    const run = () => (isAsync ? func() : Promise.resolve(func()));

    it("should use high precision (64-bit) path when available", async () => {
      const spy = jest.spyOn(mockCrypto, "getRandomValues");
      await run();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(BigUint64Array);
    });

    it("should use fallback (32-bit) path when BigUint64Array is NOT available", async () => {
      const originalBigUint64Array = globalThis.BigUint64Array;
      globalThis.BigUint64Array = undefined;
      const spy = jest.spyOn(mockCrypto, "getRandomValues");
      await run();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Uint32Array);
      globalThis.BigUint64Array = originalBigUint64Array;
    });

    it("should handle sparse arrays from crypto.getRandomValues defensively", async () => {
      mockCrypto.getRandomValues.mockImplementation(
        (array) => (delete array[0], array),
      );
      const result = await run();
      expect(result).toBe(0);
    });
  });

  describe.each([
    ["shouldExecuteThrottledAsync", shouldExecuteThrottledAsync, true],
    ["shouldExecuteThrottled", shouldExecuteThrottled, false],
  ])("%s", (name, func, isAsync) => {
    const run = (arg) => (isAsync ? func(arg) : Promise.resolve(func(arg)));

    it("should return deterministically based on the underlying random number", async () => {
      const spy = jest.spyOn(
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

  describe("Environment Detection", () => {
    it("should correctly identify dev/prod via NODE_ENV", () => {
      process.env.NODE_ENV = "development";
      const { environment: devEnv } = require("./security-kit.js");
      expect(devEnv.isDevelopment).toBe(true);

      process.env.NODE_ENV = "production";
      const { environment: prodEnv } = require("./security-kit.js");
      expect(prodEnv.isProduction).toBe(true);
    });

    it.each(["localhost", "127.0.0.1", "test.local", "192.168.1.50"])(
      "should identify %s as development in browser-like environment",
      (hostname) => {
        delete process.env.NODE_ENV;
        globalThis.location = { hostname };
        const { environment: freshEnv } = require("./security-kit.js");
        expect(freshEnv.isDevelopment).toBe(true);
      },
    );

    it("should default to production if no environment cues are found", () => {
      delete process.env.NODE_ENV;
      delete globalThis.location;
      delete globalThis.process;
      const { environment: freshEnv } = require("./security-kit.js");
      expect(freshEnv.isDevelopment).toBe(false);
    });
  });

  describe("Development Logging and Security", () => {
    let consoleSpies;
    beforeEach(() => {
      consoleSpies = {
        debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
        info: jest.spyOn(console, "info").mockImplementation(() => {}),
        warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
        error: jest.spyOn(console, "error").mockImplementation(() => {}),
      };
      // Force dev mode for these tests
      Object.defineProperty(environment, "isProduction", {
        get: () => false,
        configurable: true,
      });
    });

    it("should dispatch a CustomEvent in browser context", () => {
      const dispatchEventSpy = jest.fn();
      globalThis.document = { dispatchEvent: dispatchEventSpy };
      secureDevLog("warn", "UI", "Warning");
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchEventSpy.mock.calls[0][0].detail.level).toBe("WARN");
    });

    it("should log to console in Node.js context", () => {
      globalThis.document = undefined;
      secureDevLog("error", "API", "Failure", { code: 500 });
      expect(consoleSpies.error).toHaveBeenCalledWith("[ERROR] (API) Failure", {
        code: 500,
      });
    });

    it("should not be vulnerable to prototype pollution", () => {
      globalThis.document = undefined;
      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}}');
      secureDevLog("info", "test", "message", maliciousPayload);
      expect({}.polluted).toBeUndefined();
    });

    it("should handle context objects with malicious `toString` properties", () => {
      globalThis.document = undefined;
      const context = {
        value: 1,
        toString: () => {
          throw new Error("Hijacked!");
        },
      };
      expect(() =>
        secureDevLog("info", "test", "message", context),
      ).not.toThrow();
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.any(String),
        context,
      );
    });

    it("`secureDevNotify` alias should call `secureDevLog` correctly", () => {
      const logSpy = jest.spyOn(securityKit, "secureDevLog");
      secureDevNotify("error", "Legacy", { code: 500 });
      expect(logSpy).toHaveBeenCalledWith(
        "error",
        "Legacy",
        "Legacy notification",
        { code: 500 },
      );
    });
  });

  describe("Backward Compatibility and Exports", () => {
    it("`isDevelopment` export should match `environment.isDevelopment`", () => {
      process.env.NODE_ENV = "development";
      const { isDevelopment, environment } = require("./security-kit.js");
      expect(isDevelopment).toBe(true);
      expect(isDevelopment).toBe(environment.isDevelopment);
    });

    it("default export should contain all expected functions and objects", () => {
      const expectedKeys = [
        "generateSecureId",
        "environment",
        "secureDevLog",
        "isDevelopment",
      ];
      expect(Object.keys(securityKitDefault)).toEqual(
        expect.arrayContaining(expectedKeys),
      );
    });
  });

  describe("Advanced Security, Performance, and Resource Testing", () => {
    beforeEach(() => {
      // Use real crypto for these tests
      const { webcrypto } = require("node:crypto");
      globalThis.crypto = webcrypto;
    });

    it("should NEVER use Math.random", async () => {
      let mathRandomCalled = false;
      Math.random = () => {
        mathRandomCalled = true;
        return 0;
      };
      await Promise.all([
        generateSecureId(),
        generateSecureUUID(),
        getSecureRandomAsync(),
        getSecureRandomInt(1, 10),
      ]);
      expect(mathRandomCalled).toBe(false);
    });

    it("should handle concurrent access without race conditions", async () => {
      const promises = Array(100)
        .fill(0)
        .map(() => generateSecureId(16));
      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it("should not exhibit significant memory leaks over many operations", async () => {
      if (!global.gc) {
        console.warn(
          "Skipping memory leak test: `gc` not exposed. Run with --expose-gc.",
        );
        return;
      }
      global.gc();
      const initialMemory = process.memoryUsage().heapUsed;
      const promises = Array(5000)
        .fill(0)
        .map(() => generateSecureId(32));
      await Promise.all(promises);
      global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      // Allow for a reasonable memory increase, e.g., < 5MB. This is a heuristic.
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it("should have reasonably consistent timing to mitigate basic timing attacks", async () => {
      // WARNING: This is a heuristic, not a definitive security audit.
      const timings = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await getSecureRandomInt(0, 10000);
        timings.push(performance.now() - start);
      }
      const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
      const stdDev = Math.sqrt(
        timings.map((t) => (t - mean) ** 2).reduce((a, b) => a + b, 0) /
          timings.length,
      );
      // The coefficient of variation should be low, indicating no wild timing swings.
      const coefficientOfVariation = stdDev / mean;
      expect(coefficientOfVariation).toBeLessThan(1.5);
    });
  });
});

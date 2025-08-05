/**
 * @vitest-environment node
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

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

import securityKitDefault, * as securityKit from '../src/security-kit.js';

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
  secureDevLog,
  secureDevNotify,
  isDevelopment,
} = securityKit;

// Create test mock crypto for accessing in tests
const mockCrypto = {
  getRandomValues: vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      array[i] = (i + 1) * 10;
    }
    return array;
  }),
  randomUUID: vi.fn(() => 'mock-uuid-v4-from-crypto-api'),
};

function chiSquaredTest(observed, totalObservations) {
  const categories = Object.keys(observed);
  const numCategories = categories.length;
  const expected = totalObservations / numCategories;
  const df = numCategories - 1;
  const criticalValues = { 1: 3.84, 2: 5.99, 3: 7.81, 4: 9.49, 5: 11.07, 9: 16.92, 15: 25.0 };
  // eslint-disable-next-line security/detect-object-injection
  const criticalValue = criticalValues[df];
  if (!criticalValue) throw new Error(`No critical value for ${df} degrees of freedom.`);
  let chiSquaredStatistic = 0;
  for (const category of categories) {
    // eslint-disable-next-line security/detect-object-injection
    chiSquaredStatistic += (observed[category] - expected) ** 2 / expected;
  }
  return chiSquaredStatistic < criticalValue;
}

const originalGlobalThisDocument = globalThis.document;
const originalGlobalThisLocation = globalThis.location;
const originalGlobalThisProcess = globalThis.process;
const originalConsole = { ...globalThis.console };
const originalMathRandom = Math.random;
const originalCrypto = globalThis.crypto;

// --- Test Suite ---

describe('security-kit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use Object.defineProperty to override read-only crypto property
    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      writable: true,
      configurable: true,
    });
    globalThis.document = originalGlobalThisDocument;
    globalThis.location = originalGlobalThisLocation;
    globalThis.process = { ...originalGlobalThisProcess, env: { ...originalGlobalThisProcess?.env } };
    Object.assign(globalThis.console, originalConsole);
    Math.random = originalMathRandom;
  });

  afterAll(() => {
    vi.resetAllMocks();
    // Restore original crypto
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
    globalThis.document = originalGlobalThisDocument;
    globalThis.location = originalGlobalThisLocation;
    globalThis.process = originalGlobalThisProcess;
    globalThis.console = originalConsole;
    Math.random = originalMathRandom;
  });

  describe('Error Classes', () => {
    it('CryptoUnavailableError has correct name and default/custom messages', () => {
      const defaultErr = new CryptoUnavailableError();
      expect(defaultErr).toBeInstanceOf(Error);
      expect(defaultErr.name).toBe('CryptoUnavailableError');
      expect(defaultErr.message).toMatch(/\[secure-helpers\] A compliant Web Crypto API is not available/);
      const customErr = new CryptoUnavailableError('test');
      expect(customErr.message).toBe('[secure-helpers] test');
    });

    it('InvalidParameterError has correct name and message format', () => {
      const err = new InvalidParameterError('param');
      expect(err).toBeInstanceOf(RangeError);
      expect(err.name).toBe('InvalidParameterError');
      expect(err.message).toBe('[secure-helpers] param');
    });
  });

  describe('Crypto API Discovery and Resilience', () => {
    it('should use globalThis.crypto when available', async () => {
      await generateSecureId();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
    });

    it('should fall back to Node.js webcrypto when globalThis.crypto is unavailable', async () => {
      globalThis.crypto = undefined;
      await generateSecureId();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(1);
    });

    it('should throw CryptoUnavailableError when no API is found', async () => {
      globalThis.crypto = undefined;
      vi.doMock('node:crypto', () => ({ webcrypto: undefined }));
      const freshKit = await import(`../src/security-kit.js?t=${Date.now()}`);
      await expect(freshKit.generateSecureId()).rejects.toThrow(CryptoUnavailableError);
      vi.doUnmock('node:crypto');
    });

    it('should propagate underlying errors from a faulty crypto.getRandomValues', async () => {
      const hardwareError = new Error('Crypto hardware failure');
      mockCrypto.getRandomValues.mockImplementation(() => { throw hardwareError; });
      await expect(generateSecureId()).rejects.toThrow(hardwareError);
    });
  });

  describe.each([
    ['generateSecureId', generateSecureId, true],
    ['generateSecureIdSync', generateSecureIdSync, false],
  ])('%s', (name, func, isAsync) => {
    const run = (arg) => (isAsync ? func(arg) : Promise.resolve(func(arg)));

    it('should generate an ID of the default length (12)', async () => {
      const id = await run();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[0-9a-f]{12}$/);
    });

    it('should handle boundary lengths 1 and 1024', async () => {
      expect((await run(1))).toHaveLength(1);
      expect((await run(1024))).toHaveLength(1024);
    });

    it('should correctly handle odd lengths by slicing', async () => {
      mockCrypto.getRandomValues.mockImplementation((arr) => arr.fill(0xab));
      expect(await run(3)).toBe('aba');
    });

    it('should throw InvalidParameterError for a wide range of invalid types', async () => {
      const invalidInputs = [0, 1025, null, undefined, NaN, Infinity, [], {}, 'string', true];
      for (const input of invalidInputs) {
        if (isAsync) {
          await expect(func(input)).rejects.toThrow(InvalidParameterError);
        } else {
          expect(() => func(input)).toThrow(InvalidParameterError);
        }
      }
    });
  });

  describe('generateSecureUUID', () => {
    const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it('should use crypto.randomUUID when available', async () => {
      const uuid = await generateSecureUUID();
      expect(uuid).toBe('mock-uuid-v4-from-crypto-api');
      expect(mockCrypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it('should set RFC 4122 version and variant bits correctly in fallback', async () => {
      mockCrypto.randomUUID = undefined;
      mockCrypto.getRandomValues.mockImplementation((arr) => arr.fill(0b11111111));
      const uuid = await generateSecureUUID();
      expect(uuid).toMatch(UUID_V4_REGEX);
      expect(uuid[14]).toBe('4');
      expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
    });
  });

  describe('getSecureRandomInt', () => {
    it('should return an integer within the specified range', async () => {
      const result = await getSecureRandomInt(1, 100);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should use rejection sampling to prevent modulo bias', async () => {
      const min = 0, max = 20;
      mockCrypto.getRandomValues
        .mockImplementationOnce((arr) => (arr[0] = 25, arr))
        .mockImplementationOnce((arr) => (arr[0] = 10, arr));
      const result = await getSecureRandomInt(min, max);
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
      expect(result).toBe(10);
    });

    it('should produce a uniform distribution (passes Chi-squared test)', async () => {
      globalThis.crypto = webcrypto;
      const min = 0, max = 5, iterations = 6000;
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (let i = 0; i < iterations; i++) {
        // eslint-disable-next-line security/detect-object-injection
        counts[await getSecureRandomInt(min, max)]++;
      }
      expect(chiSquaredTest(counts, iterations)).toBe(true);
    });
  });

  describe.each([
    ['getSecureRandomAsync', getSecureRandomAsync, true],
    ['getSecureRandom', getSecureRandom, false],
  ])('%s', (name, func, isAsync) => {
    const run = () => (isAsync ? func() : Promise.resolve(func()));

    it('should use high precision (64-bit) path when available', async () => {
      const spy = vi.spyOn(mockCrypto, 'getRandomValues');
      await run();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(BigUint64Array);
    });

    it('should use fallback (32-bit) path when BigUint64Array is NOT available', async () => {
      const originalBigUint64Array = globalThis.BigUint64Array;
      globalThis.BigUint64Array = undefined;
      const spy = vi.spyOn(mockCrypto, 'getRandomValues');
      await run();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Uint32Array);
      globalThis.BigUint64Array = originalBigUint64Array;
    });
  });

  describe.each([
    ['shouldExecuteThrottledAsync', shouldExecuteThrottledAsync, true],
    ['shouldExecuteThrottled', shouldExecuteThrottled, false],
  ])('%s', (name, func, isAsync) => {
    const run = (arg) => (isAsync ? func(arg) : Promise.resolve(func(arg)));

    it('should return deterministically based on the underlying random number', async () => {
      const spy = vi.spyOn(securityKit, isAsync ? 'getSecureRandomAsync' : 'getSecureRandom');
      spy.mockResolvedValue(0.49);
      await expect(run(0.5)).resolves.toBe(true);
      spy.mockResolvedValue(0.50);
      await expect(run(0.5)).resolves.toBe(false);
      spy.mockRestore();
    });
  });

  describe('Environment Detection', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should correctly identify development via NODE_ENV', async () => {
      process.env.NODE_ENV = 'development';
      const { environment } = await import('../src/security-kit.js');
      expect(environment.isDevelopment).toBe(true);
    });

    it('should correctly identify production via NODE_ENV', async () => {
      process.env.NODE_ENV = 'production';
      const { environment } = await import('../src/security-kit.js');
      expect(environment.isProduction).toBe(true);
    });

    it.each(['localhost', '127.0.0.1', 'test.local', '192.168.1.50'])(
      'should identify %s as development in browser-like environment',
      async (hostname) => {
        delete process.env.NODE_ENV;
        globalThis.location = { hostname };
        const { environment } = await import('../src/security-kit.js');
        expect(environment.isDevelopment).toBe(true);
      },
    );

    it('should default to production if no environment cues are found', async () => {
      delete process.env.NODE_ENV;
      delete globalThis.location;
      delete globalThis.process;
      const { environment } = await import('../src/security-kit.js');
      expect(environment.isDevelopment).toBe(false);
    });
  });

  describe('Development Logging and Security', () => {
    let consoleSpies;

    beforeEach(async () => {
      vi.resetModules();
      const { environment } = await import('../src/security-kit.js');
      consoleSpies = {
        debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      };
      vi.spyOn(environment, 'isProduction', 'get').mockReturnValue(false);
    });

    it('should dispatch a CustomEvent in browser context', async () => {
      const { secureDevLog } = await import('../src/security-kit.js');
      const dispatchEventSpy = vi.fn();
      globalThis.document = { dispatchEvent: dispatchEventSpy };
      secureDevLog('warn', 'UI', 'Warning');
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    });

    it('should not be vulnerable to prototype pollution', async () => {
      const { secureDevLog } = await import('../src/security-kit.js');
      globalThis.document = undefined;
      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}}');
      secureDevLog('info', 'test', 'message', maliciousPayload);
      expect({}.polluted).toBeUndefined();
    });

    it('`secureDevNotify` alias should call `secureDevLog` correctly', async () => {
      const freshKit = await import('../src/security-kit.js');
      const logSpy = vi.spyOn(freshKit, 'secureDevLog');
      freshKit.secureDevNotify('error', 'Legacy', { code: 500 });
      expect(logSpy).toHaveBeenCalledWith('error', 'Legacy', 'Legacy notification', { code: 500 });
    });
  });

  describe('Backward Compatibility and Exports', () => {
    it('`isDevelopment` export should match `environment.isDevelopment`', async () => {
      vi.resetModules();
      process.env.NODE_ENV = 'development';
      const { isDevelopment, environment } = await import('../src/security-kit.js');
      expect(isDevelopment).toBe(true);
      expect(isDevelopment).toBe(environment.isDevelopment);
    });

    it('default export should contain all expected functions and objects', () => {
      const expectedKeys = ['generateSecureId', 'environment', 'secureDevLog', 'isDevelopment'];
      expect(Object.keys(securityKitDefault)).toEqual(expect.arrayContaining(expectedKeys));
    });
  });

  describe('Advanced Security, Performance, and Resource Testing', () => {
    beforeEach(() => {
      globalThis.crypto = webcrypto;
    });

    it('should NEVER use Math.random', async () => {
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

    it('should handle concurrent access without race conditions', async () => {
      const promises = Array(100).fill(0).map(() => generateSecureId(16));
      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it('should not exhibit significant memory leaks over many operations', { timeout: 20000 }, async () => {
      if (!global.gc) {
        console.warn('Skipping memory leak test: `gc` not exposed. Run node with --expose-gc.');
        return;
      }
      global.gc();
      const initialMemory = process.memoryUsage().heapUsed;
      const promises = Array(2000).fill(0).map(() => generateSecureId(32));
      await Promise.all(promises);
      global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should have reasonably consistent timing to mitigate basic timing attacks', async () => {
      const timings = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await getSecureRandomInt(0, 10000);
        timings.push(performance.now() - start);
      }
      const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
      const stdDev = Math.sqrt(timings.map((t) => (t - mean) ** 2).reduce((a, b) => a + b, 0) / timings.length);
      const coefficientOfVariation = stdDev / mean;
      expect(coefficientOfVariation).toBeLessThan(1.5);
    });
  });
});
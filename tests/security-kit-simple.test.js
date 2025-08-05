import { describe, it, expect, beforeEach, vi } from "vitest";
import * as securityKit from "../src/security-kit.js";

const {
  CryptoUnavailableError,
  InvalidParameterError,
  generateSecureId,
  generateSecureIdSync,
  generateSecureUUID,
  getSecureRandomInt,
} = securityKit;

describe("security-kit", () => {
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

  describe("generateSecureId", () => {
    it("should generate an ID of the default length (12)", async () => {
      const id = await generateSecureId();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[0-9a-f]{12}$/);
    });

    it("should handle boundary lengths 1 and 1024", async () => {
      expect(await generateSecureId(1)).toHaveLength(1);
      expect(await generateSecureId(1024)).toHaveLength(1024);
    });

    it("should throw InvalidParameterError for invalid types", async () => {
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
        await expect(generateSecureId(input)).rejects.toThrow(
          InvalidParameterError,
        );
      }
    });
  });

  describe("generateSecureIdSync", () => {
    it("should generate an ID of the default length (12)", () => {
      const id = generateSecureIdSync();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[0-9a-f]{12}$/);
    });

    it("should handle boundary lengths 1 and 1024", () => {
      expect(generateSecureIdSync(1)).toHaveLength(1);
      expect(generateSecureIdSync(1024)).toHaveLength(1024);
    });

    it("should throw InvalidParameterError for invalid types", () => {
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
        expect(() => generateSecureIdSync(input)).toThrow(
          InvalidParameterError,
        );
      }
    });
  });

  describe("generateSecureUUID", () => {
    const UUID_V4_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it("should generate a valid UUID v4", async () => {
      const uuid = await generateSecureUUID();
      expect(uuid).toMatch(UUID_V4_REGEX);
      expect(uuid[14]).toBe("4"); // Version bit
      expect(["8", "9", "a", "b"]).toContain(uuid[19]); // Variant bits
    });
  });

  describe("getSecureRandomInt", () => {
    it("should return an integer within the specified range", async () => {
      const result = await getSecureRandomInt(1, 100);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should handle single value range", async () => {
      const result = await getSecureRandomInt(5, 5);
      expect(result).toBe(5);
    });
  });

  describe("Basic functionality tests", () => {
    it("should generate unique IDs", async () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(await generateSecureId());
      }
      expect(ids.size).toBe(100); // All IDs should be unique
    });

    it("should generate unique UUIDs", async () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(await generateSecureUUID());
      }
      expect(uuids.size).toBe(100); // All UUIDs should be unique
    });
  });
});

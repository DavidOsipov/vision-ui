import { describe, it, expect } from "vitest";
import * as securityKit from "../src/security-kit.js";

describe("security-kit basic test", () => {
  it("should import the module successfully", () => {
    expect(securityKit).toBeDefined();
    expect(typeof securityKit.generateSecureId).toBe("function");
  });

  it("should generate a secure ID", async () => {
    const id = await securityKit.generateSecureId();
    expect(typeof id).toBe("string");
    expect(id).toHaveLength(12);
  });
});

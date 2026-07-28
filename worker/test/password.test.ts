import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password";

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const { hash, salt } = await hashPassword("correct-horse-battery-staple", 1000);
    expect(await verifyPassword("correct-horse-battery-staple", hash, salt, 1000)).toBe(true);
    expect(await verifyPassword("wrong-password", hash, salt, 1000)).toBe(false);
  });

  it("never stores the password itself", async () => {
    const { hash, salt } = await hashPassword("hunter2", 1000);
    expect(hash).not.toContain("hunter2");
    expect(salt).not.toContain("hunter2");
  });

  it("clamps iteration counts above the Workers PBKDF2 cap instead of erroring", async () => {
    // Cloudflare Workers' crypto.subtle.deriveBits throws NotSupportedError above
    // 100,000 iterations - this regression test guards the clamp in deriveBits().
    const { hash, salt } = await hashPassword("some-password", 500_000);
    expect(await verifyPassword("some-password", hash, salt, 500_000)).toBe(true);
  });
});

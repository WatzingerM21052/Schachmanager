import { describe, expect, it } from "vitest";
import { signJwt, verifyJwt } from "../src/auth/jwt";

describe("jwt sign/verify", () => {
  it("round-trips a valid token", async () => {
    const token = await signJwt({ sub: 1, username: "admin", role: "Admin" }, "test-secret");
    const payload = await verifyJwt(token, "test-secret");
    expect(payload?.sub).toBe(1);
    expect(payload?.role).toBe("Admin");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signJwt({ sub: 1, username: "admin", role: "Admin" }, "test-secret");
    const payload = await verifyJwt(token, "wrong-secret");
    expect(payload).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signJwt({ sub: 1, username: "admin", role: "Member" }, "test-secret");
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifyJwt(tampered, "test-secret")).toBeNull();
  });
});

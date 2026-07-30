import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as auth from "@/lib/auth";

const SECRET = "test-jwt-secret-very-long-and-secure-xxxxxxxxxxxx";

const session = {
  sub: "user-1",
  email: "admin@yourbrand.com",
  name: "Admin",
  role: "ADMIN" as const,
};

describe("auth: password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hash = await auth.hashPassword("s3cret");
    expect(hash).not.toBe("s3cret");
    expect(await auth.verifyPassword("s3cret", hash)).toBe(true);
    expect(await auth.verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for same password (salt)", async () => {
    const a = await auth.hashPassword("same");
    const b = await auth.hashPassword("same");
    expect(a).not.toBe(b);
  });
});

describe("auth: JWT session tokens", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_JWT_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a session token", async () => {
    const token = await auth.createSessionToken(session);
    const parsed = await auth.verifySessionToken(token);
    expect(parsed).toEqual(session);
  });

  it("returns null for a tampered token", async () => {
    const token = await auth.createSessionToken(session);
    const tampered = token.slice(0, -4) + "AAAA";
    expect(await auth.verifySessionToken(tampered)).toBeNull();
  });

  it("returns null for garbage input", async () => {
    expect(await auth.verifySessionToken("not-a-token")).toBeNull();
  });

  it("returns null for token signed with a different secret", async () => {
    vi.stubEnv("ADMIN_JWT_SECRET", SECRET);
    const token = await auth.createSessionToken(session);
    vi.stubEnv("ADMIN_JWT_SECRET", "a-completely-different-secret-value-here");
    expect(await auth.verifySessionToken(token)).toBeNull();
  });

  it("normalizes unknown role to ADMIN", async () => {
    // @ts-expect-error: intentionally invalid role
    const token = await auth.createSessionToken({ ...session, role: "WEIRD" });
    // verifySessionToken maps anything non-SUPERADMIN to ADMIN
    const parsed = await auth.verifySessionToken(token);
    expect(parsed?.role).toBe("ADMIN");
  });

  it("throws when ADMIN_JWT_SECRET is missing", async () => {
    vi.stubEnv("ADMIN_JWT_SECRET", "");
    await expect(auth.createSessionToken(session)).rejects.toThrow(
      /ADMIN_JWT_SECRET/,
    );
  });
});
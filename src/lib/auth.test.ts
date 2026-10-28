import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as auth from "@/lib/auth";
import { SignJWT } from "jose";
import { createHmac } from "node:crypto";

const { findUnique, queryRaw, deleteMany } = vi.hoisted(() => ({ findUnique: vi.fn(), queryRaw: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { adminUser: { findUnique }, authThrottle: { deleteMany }, $queryRaw: queryRaw } }));

const SECRET = "test-jwt-secret-very-long-and-secure-xxxxxxxxxxxx";

const session = {
  sub: "user-1",
  email: "admin@yourbrand.com",
  name: "Admin",
  role: "ADMIN" as const,
  credentialVersion: createHmac("sha256", SECRET).update("hash-before-rotation").digest("hex"),
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
    findUnique.mockResolvedValue({ id: session.sub, ...session, passwordHash: "hash-before-rotation" });
    queryRaw.mockResolvedValue([{ attempts: 1 }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a session token", async () => {
    const token = await auth.createSessionToken(session);
    const parsed = await auth.verifySessionToken(token);
    expect(parsed).toEqual({ sub: session.sub, email: session.email, name: session.name, role: session.role });
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

  it("rejects sessions after password rotation", async () => {
    const token = await auth.createSessionToken(session);
    findUnique.mockResolvedValue({ ...session, passwordHash: "hash-after-rotation" });
    expect(await auth.verifySessionToken(token)).toBeNull();
  });

  it("rejects password rotation between authentication and token issuance", async () => {
    findUnique.mockResolvedValue({ ...session, passwordHash: "new-hash" });
    await expect(auth.createSessionToken(session)).rejects.toThrow("credentials changed");
  });

  it("enforces the shared login limit before password verification", async () => {
    queryRaw.mockResolvedValue([{ attempts: 6 }]);
    expect(await auth.authenticateAdmin(session.email, "password")).toBeNull();
    expect(queryRaw).toHaveBeenCalled();
  });

  it("clears the failed-attempt limiter after a successful login", async () => {
    await expect(auth.authenticateAdmin(session.email, "not-the-password")).resolves.toBeNull();
    // Reuse a real bcrypt hash so this verifies the success path.
    findUnique.mockResolvedValue({ id: session.sub, ...session, passwordHash: await auth.hashPassword("right-password") });
    await expect(auth.authenticateAdmin(session.email, "right-password")).resolves.toMatchObject({ sub: session.sub });
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it("rejects deleted accounts", async () => {
    const token = await auth.createSessionToken(session);
    findUnique.mockResolvedValue(null);
    expect(await auth.verifySessionToken(token)).toBeNull();
  });

  it("uses the current database role instead of the signed role", async () => {
    findUnique.mockResolvedValue({ ...session, role: "SUPERADMIN", passwordHash: "hash-before-rotation" });
    const token = await auth.createSessionToken(session);
    findUnique.mockResolvedValue({ ...session, passwordHash: "hash-before-rotation" });
    expect((await auth.verifySessionToken(token))?.role).toBe("ADMIN");
  });

  it("rejects legacy tokens without credential binding", async () => {
    const token = await new SignJWT({ email: session.email, role: "SUPERADMIN" })
      .setSubject(session.sub).setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
    expect(await auth.verifySessionToken(token)).toBeNull();
  });

  it("throws when ADMIN_JWT_SECRET is missing", async () => {
    vi.stubEnv("ADMIN_JWT_SECRET", "");
    await expect(auth.createSessionToken(session)).rejects.toThrow(
      /ADMIN_JWT_SECRET/,
    );
  });
});

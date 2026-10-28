import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type AdminSession = {
  sub: string;
  email: string;
  name: string;
  role: "ADMIN" | "SUPERADMIN";
};

type AuthenticatedAdmin = AdminSession & { credentialVersion: string };

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("ADMIN_JWT_SECRET must contain at least 32 bytes");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  user: AuthenticatedAdmin,
): Promise<string> {
  const current = await prisma.adminUser.findUnique({ where: { id: user.sub } });
  if (!current) throw new Error("Admin account no longer exists");
  if (user.credentialVersion !== credentialVersion(current.passwordHash)) throw new Error("Admin credentials changed during login");
  return new SignJWT({
    email: current.email,
    name: current.name,
    role: current.role,
    credentialVersion: credentialVersion(current.passwordHash),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

function credentialVersion(passwordHash: string): string {
  return createHmac("sha256", getJwtSecret()).update(passwordHash).digest("hex");
}

function loginThrottleKey(email: string): string {
  return `login:${createHmac("sha256", getJwtSecret()).update(email).digest("hex")}`;
}

export async function verifySessionToken(
  token: string,
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string") return null;
    const current = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!current || payload.credentialVersion !== credentialVersion(current.passwordHash)) return null;

    return {
      sub: payload.sub,
      email: current.email,
      name: current.name,
      role: current.role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireAdminApi(): Promise<AdminSession | Response> {
  const session = await getSession();
  if (!session) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AuthenticatedAdmin | null> {
  if (email.length > 254 || !password || Buffer.byteLength(password) > 72) return null;
  const normalizedEmail = email.toLowerCase().trim();
  const key = loginThrottleKey(normalizedEmail);
  // Atomically count every credential attempt without revealing whether the
  // account exists. Successful sign-in clears this particular limiter below.
  const [limit] = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthThrottle" ("key", "attempts", "resetAt")
    VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthThrottle"."resetAt" <= NOW() THEN 1 ELSE LEAST("AuthThrottle"."attempts" + 1, 1000000) END,
      "resetAt" = CASE WHEN "AuthThrottle"."resetAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "AuthThrottle"."resetAt" END
    RETURNING "attempts"
  `;
  if (!limit || limit.attempts > 5) return null;
  const user = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  await prisma.authThrottle.deleteMany({ where: { key } });

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    credentialVersion: credentialVersion(user.passwordHash),
  };
}


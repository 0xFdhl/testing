import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function resolvePgUrl(raw: string): string {
  if (!raw.startsWith("prisma+postgres://")) return raw;
  const u = new URL(raw);
  const apiKey = u.searchParams.get("api_key");
  if (!apiKey) return raw;
  const pad = apiKey + "=".repeat((4 - (apiKey.length % 4)) % 4);
  const { databaseUrl } = JSON.parse(
    Buffer.from(pad, "base64url").toString("utf8"),
  );
  return databaseUrl;
}

function toTransactionPooler(raw: string): string {
  const u = new URL(raw);
  // Supabase session pooler (port 5432) is capped at 15 concurrent sessions.
  // Route runtime traffic through the transaction pooler (6543, pgbouncer=true),
  // which supports ~10k connections. Keeps DIRECT_URL (5432) for migrations.
  if (u.hostname.endsWith(".pooler.supabase.com") && u.port === "5432") {
    u.port = "6543";
    u.searchParams.set("pgbouncer", "true");
  }
  return u.toString();
}

const raw = process.env.DATABASE_URL ?? "";
const connectionString = toTransactionPooler(resolvePgUrl(raw));
if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}
const adapter = new PrismaPg({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
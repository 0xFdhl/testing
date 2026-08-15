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

const raw = process.env.DATABASE_URL ?? "";
const connectionString = resolvePgUrl(raw);
if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}
const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
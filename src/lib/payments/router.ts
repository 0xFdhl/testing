import "server-only";
import { prisma } from "@/lib/prisma";
import type { Provider, Region } from "./types";

export function resolveGateway(region: Region): Provider {
  return region === "intrl" ? "stripe" : "xendit";
}

export async function getUserRegion(userId: string): Promise<Region> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { region: true },
  });
  return (u?.region as Region | null) ?? "id";
}

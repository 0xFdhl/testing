"use server";

import { auth } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type Region = "id" | "intrl";

export async function setRegion(region: Region): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized." };
  }

  if (region !== "id" && region !== "intrl") {
    return { ok: false, error: "Region tidak valid." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { region },
    });

    revalidatePath("/account");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal mengupdate region. Coba lagi." };
  }
}

export async function getRegion(): Promise<Region> {
  const session = await auth();
  if (!session?.user?.id) return "id";

  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { region: true },
  });

  return u?.region as Region ?? "id";
}

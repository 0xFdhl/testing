import { describe, it, expect, beforeEach, vi } from "vitest";

const { deleteManyMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn<(arg: unknown) => Promise<{ count: number }>>(
    async () => ({ count: 5 }),
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { webhookEvent: { deleteMany: deleteManyMock } },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

import { purgeOldWebhookEvents } from "@/lib/webhook-retention";

type PurgeArgs = {
  where: {
    createdAt: { lt: Date };
    status: { in: string[] };
  };
};

describe("purgeOldWebhookEvents", () => {
  beforeEach(() => {
    deleteManyMock.mockClear();
  });

  it("deletes processed events older than retention window", async () => {
    const count = await purgeOldWebhookEvents(90);
    expect(count).toBe(5);
    expect(deleteManyMock).toHaveBeenCalledTimes(1);
    const arg = deleteManyMock.mock.calls[0]![0] as PurgeArgs;
    expect(arg.where.status).toEqual({ in: ["processed"] });
    expect(arg.where.createdAt).toHaveProperty("lt");
    expect(arg.where.createdAt.lt).toBeInstanceOf(Date);
  });

  it("passes through custom retention days", async () => {
    await purgeOldWebhookEvents(7);
    const arg = deleteManyMock.mock.calls[0]![0] as PurgeArgs;
    const cutoff: Date = arg.where.createdAt.lt;
    const expectedMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expectedMs)).toBeLessThan(1000);
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), order: vi.fn(), reconcile: vi.fn() }));
vi.mock("@/lib/next-auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/orders", () => ({ getOrderByExternalId: mocks.order }));
vi.mock("@/lib/payments/reconcile", () => ({ reconcilePayment: mocks.reconcile }));
vi.mock("@/lib/payments/checkout", () => ({ checkoutForUser: vi.fn() }));
import { getCheckoutOrder, markOrderCancelledIfPending, syncOrderPaymentStatus } from "./checkout";
beforeEach(() => vi.clearAllMocks());
describe("checkout action authorization", () => {
  it.each([getCheckoutOrder, markOrderCancelledIfPending, syncOrderPaymentStatus])("rejects caller-supplied identities", async (action) => {
    mocks.auth.mockResolvedValue({ user: { id: "attacker" } });
    expect(await action("ORD-victim", "victim")).toBeNull();
    expect(mocks.order).not.toHaveBeenCalled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it("uses verified reconciliation on a cancellation redirect", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.order.mockResolvedValue({ externalId: "ORD-1", status: "PENDING", gatewayInvoiceId: "inv-1" });
    expect((await markOrderCancelledIfPending("ORD-1", "owner"))?.status).toBe("PENDING");
    expect(mocks.reconcile).toHaveBeenCalledWith("ORD-1");
  });
});

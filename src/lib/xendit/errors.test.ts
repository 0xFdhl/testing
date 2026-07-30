import { describe, it, expect } from "vitest";
import {
  XenditError,
  toCheckoutErrorMessage,
} from "@/lib/xendit/errors";
import {
  INDONESIA_INVOICE_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/xendit/payment-methods";

describe("XenditError", () => {
  it("carries default userMessage in Indonesian", () => {
    const err = new XenditError("boom");
    expect(err.name).toBe("XenditError");
    expect(err.userMessage).toContain("pembayaran");
  });

  it("uses provided userMessage and statusCode", () => {
    const err = new XenditError("boom", {
      statusCode: 400,
      userMessage: "custom",
    });
    expect(err.statusCode).toBe(400);
    expect(err.userMessage).toBe("custom");
  });

  it("is an Error instance", () => {
    expect(new XenditError("x")).toBeInstanceOf(Error);
  });
});

describe("toCheckoutErrorMessage", () => {
  it("returns userMessage for XenditError", () => {
    const err = new XenditError("x", { userMessage: "custom msg" });
    expect(toCheckoutErrorMessage(err)).toBe("custom msg");
  });

  it("returns setup hint when message indicates not configured", () => {
    const err = new Error("something is not configured bla");
    expect(toCheckoutErrorMessage(err)).toContain(".env");
  });

  it("returns generic fallback for other errors", () => {
    expect(toCheckoutErrorMessage(new Error("network down"))).toContain(
      "Gagal",
    );
  });
});

describe("payment methods", () => {
  it("includes key Indonesian channels", () => {
    expect(INDONESIA_INVOICE_PAYMENT_METHODS).toContain("QRIS");
    expect(INDONESIA_INVOICE_PAYMENT_METHODS).toContain("BCA");
    expect(INDONESIA_INVOICE_PAYMENT_METHODS).toContain("CREDIT_CARD");
  });

  it("every method has a label", () => {
    for (const method of INDONESIA_INVOICE_PAYMENT_METHODS) {
      expect(PAYMENT_METHOD_LABELS[method]).toBeTruthy();
    }
  });
});
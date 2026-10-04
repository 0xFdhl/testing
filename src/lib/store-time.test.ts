import { describe, expect, it } from "vitest";
import {
  getMonthKey,
  getSalesPeriodStart,
  getStoreMonthDates,
} from "@/lib/store-time";

describe("store month boundaries", () => {
  it("uses Jakarta time around a UTC month boundary", () => {
    expect(getMonthKey(new Date("2026-09-30T18:00:00.000Z"))).toBe("2026-10");
  });

  it("returns the Jakarta start of the earliest included month", () => {
    expect(getSalesPeriodStart(new Date("2026-09-26T05:00:00.000Z"), 12)).toEqual(
      new Date("2025-10-01T00:00:00+07:00"),
    );
  });

  it("builds consecutive month buckets across a year boundary", () => {
    expect(
      getStoreMonthDates(new Date("2026-01-10T05:00:00.000Z"), 3).map(getMonthKey),
    ).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

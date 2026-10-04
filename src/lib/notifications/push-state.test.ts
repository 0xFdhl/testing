import { describe, expect, it } from "vitest";
import { resolvePushState } from "@/lib/notifications/push-state";

describe("resolvePushState", () => {
  it("does not report enabled when permission exists without a subscription", () => {
    expect(resolvePushState("granted", false)).toBe("default");
  });

  it("reports enabled only when permission and subscription both exist", () => {
    expect(resolvePushState("granted", true)).toBe("granted");
  });

  it("preserves a denied permission", () => {
    expect(resolvePushState("denied", false)).toBe("denied");
  });
});

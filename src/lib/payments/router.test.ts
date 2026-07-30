import { describe, it, expect } from "vitest";
import { resolveGateway } from "./router";

describe("resolveGateway", () => {
  it("returns xendit for id region", () => {
    expect(resolveGateway("id")).toBe("xendit");
  });

  it("returns stripe for intrl region", () => {
    expect(resolveGateway("intrl")).toBe("stripe");
  });
});

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
  });

  it("deduplicates conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional and falsy values", () => {
    expect(cn("base", false && "no", null, undefined, "", "ok")).toBe(
      "base ok",
    );
  });

  it("merges objects and arrays from clsx", () => {
    expect(cn(["a", { b: true, c: false }], "d")).toBe("a b d");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
import { expect, it, vi } from "vitest";
import { POST } from "./route";

it("retires payment creation without contacting a gateway", async () => {
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network forbidden"));
  try {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toHaveProperty("error");
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});

import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, renderTemplate } from "./templates";

describe("renderTemplate", () => {
  const vars = {
    customer_name: "Andi",
    order_id: "ORD-123",
    total: "Rp.299.000",
    status: "PAID",
  };

  it("replaces all known variables", () => {
    expect(
      renderTemplate(
        "Halo {{customer_name}}, order {{order_id}} sebesar {{total}} ({{status}})",
        vars,
      ),
    ).toBe("Halo Andi, order ORD-123 sebesar Rp.299.000 (PAID)");
  });

  it("leaves unknown variables untouched", () => {
    expect(renderTemplate("{{unknown}} {{customer_name}}", vars)).toBe(
      "{{unknown}} Andi",
    );
  });

  it("handles whitespace inside braces", () => {
    expect(renderTemplate("{{ customer_name }}", vars)).toBe("Andi");
  });

  it("handles repeated variables", () => {
    expect(renderTemplate("{{order_id}} / {{order_id}}", vars)).toBe(
      "ORD-123 / ORD-123",
    );
  });
});

describe("DEFAULT_TEMPLATES", () => {
  it("has non-empty title and message for every event", () => {
    for (const template of Object.values(DEFAULT_TEMPLATES)) {
      expect(template.title.length).toBeGreaterThan(0);
      expect(template.message.length).toBeGreaterThan(0);
    }
  });

  it("every default message references at least one variable", () => {
    for (const template of Object.values(DEFAULT_TEMPLATES)) {
      expect(template.message).toMatch(/\{\{/);
    }
  });
});
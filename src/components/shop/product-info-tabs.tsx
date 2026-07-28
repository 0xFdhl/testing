"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

type AccordionId = "description" | "sizing" | "shipping";

const ACCORDIONS: { id: AccordionId; label: string }[] = [
  { id: "description", label: "DESCRIPTION" },
  { id: "sizing", label: "SIZING" },
  { id: "shipping", label: "SHIPPING" },
];

const DEFAULT_DESCRIPTION =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const CATEGORY_DEFAULTS = {
  jacket: {
    colorLabel: "BLACK / GREY / WHITE",
    fitNote: "INSULATED PERFORMANCE FIT",
    sizing: [
      "Model is 180 cm and wears size L.",
      "XS–S available on custom order only.",
      "Chest (cm): M 52 · L 55 · XL 58",
      "Length (cm): M 68 · L 70 · XL 72",
    ],
  },
  snowboard: {
    colorLabel: "BLACK / GREY / WHITE",
    fitNote: "FREERIDE CARVE PROFILE",
    sizing: [
      "Refer to board length chart for rider weight and height.",
      "Bindings compatible with standard insert patterns.",
      "Contact support for custom width options.",
    ],
  },
  ski: {
    colorLabel: "BLACK / GREY / WHITE",
    fitNote: "ALL-MOUNTAIN SKI SET",
    sizing: [
      "Set includes skis, bindings, and poles where noted.",
      "Boot sizing chart available on request.",
      "Professional mounting recommended.",
    ],
  },
  goggles: {
    colorLabel: "BLACK / GREY / WHITE",
    fitNote: "LOW-LIGHT LENS READY",
    sizing: [
      "Universal helmet-compatible frame.",
      "Anti-fog double lens construction.",
      "Adjustable strap with silicone grip.",
    ],
  },
} as const;

const SHIPPING_POINTS = [
  "Orders ship within 2–4 business days after payment confirmation.",
  "Domestic delivery typically arrives in 3–7 business days.",
  "International shipping available to selected regions.",
  "Tracking details are sent by email once your order is dispatched.",
];

const RETURNS_POINTS = [
  "Returns accepted within 14 days of delivery.",
  "Items must be unworn, unwashed, and include original tags.",
  "Custom order pieces are final sale unless defective.",
  "Contact support to initiate a return or exchange.",
];

type ProductInfoAccordionsProps = {
  product: Product;
  openSection?: AccordionId | null;
  onOpenSectionChange?: (section: AccordionId | null) => void;
};

function toUpperCopy(text: string): string {
  return text.toUpperCase();
}

export function ProductInfoAccordions({
  product,
  openSection: controlledOpen,
  onOpenSectionChange,
}: ProductInfoAccordionsProps) {
  const [internalOpen, setInternalOpen] = useState<AccordionId | null>(null);
  const baseId = useId();

  const openSection = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpenSection = (section: AccordionId | null) => {
    if (onOpenSectionChange) {
      onOpenSectionChange(section);
    } else {
      setInternalOpen(section);
    }
  };

  const toggleSection = (section: AccordionId) => {
    setOpenSection(openSection === section ? null : section);
  };

  const categoryDefaults = CATEGORY_DEFAULTS[product.category];
  const colorLabel = product.colorLabel ?? categoryDefaults.colorLabel;
  const fitNote = product.fitNote ?? categoryDefaults.fitNote;
  const description = product.description ?? DEFAULT_DESCRIPTION;
  const sizingPoints = product.sizingInfo ?? categoryDefaults.sizing;
  const shippingPoints = product.shippingInfo ?? SHIPPING_POINTS;
  const returnsPoints = product.returnsInfo ?? RETURNS_POINTS;

  return (
    <div className="mt-10 border-t border-black/10 pt-2 md:mt-12">
      {ACCORDIONS.map((accordion) => {
        const isOpen = openSection === accordion.id;
        const panelId = `${baseId}-${accordion.id}-panel`;
        const triggerId = `${baseId}-${accordion.id}-trigger`;

        return (
          <div key={accordion.id} className="border-b border-black/10">
            <button
              type="button"
              id={triggerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleSection(accordion.id)}
              className="flex w-full items-center justify-between rounded-sm py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <span className="text-xs font-medium tracking-[0.14em] text-black uppercase sm:text-sm">
                {accordion.label}
              </span>
              <Plus
                aria-hidden
                className={cn(
                  "h-4 w-4 shrink-0 stroke-[1.5] text-black transition-transform duration-200",
                  isOpen && "rotate-45",
                )}
              />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className={cn(!isOpen && "hidden")}
            >
              {accordion.id === "description" && (
                <div className="pb-6">
                  <p className="text-[11px] font-medium tracking-[0.12em] text-black uppercase sm:text-xs">
                    {colorLabel}
                  </p>
                  <p className="mt-3 text-[11px] leading-relaxed tracking-[0.06em] text-black/80 uppercase sm:text-xs">
                    {toUpperCopy(description)}
                  </p>
                  <p className="mt-3 text-[11px] tracking-[0.08em] text-black/55 uppercase sm:text-xs">
                    • {fitNote}
                  </p>
                </div>
              )}

              {accordion.id === "sizing" && (
                <div className="pb-6">
                  <ul className="space-y-2 text-[11px] leading-relaxed tracking-[0.06em] text-black/80 uppercase sm:text-xs">
                    {sizingPoints.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[11px] leading-relaxed tracking-[0.06em] text-black/55 uppercase sm:text-xs">
                    Measurements are approximate. For custom sizing, select XS or
                    S and note your preferred fit at checkout.
                  </p>
                </div>
              )}

              {accordion.id === "shipping" && (
                <div className="pb-6">
                  <ul className="space-y-2 text-[11px] leading-relaxed tracking-[0.06em] text-black/80 uppercase sm:text-xs">
                    {shippingPoints.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                  <p className="mt-6 text-[11px] font-medium tracking-[0.12em] text-black uppercase sm:text-xs">
                    Returns
                  </p>
                  <ul className="mt-3 space-y-2 text-[11px] leading-relaxed tracking-[0.06em] text-black/80 uppercase sm:text-xs">
                    {returnsPoints.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}



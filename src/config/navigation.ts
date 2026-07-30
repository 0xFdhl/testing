import {
  shopCategoryFilters,
  type ShopFilterCategory,
} from "@/lib/products";

export type NavLinkItem = {
  id: string;
  href: string;
  label: string;
};

export type NavLink = {
  href: string;
  label: string;
  description?: string;
};

export const mainNavLinks: NavLinkItem[] = [
  { id: "home", href: "/", label: "HOME" },
  { id: "shop", href: "/shop", label: "CATALOG" },
];

export const shopNavLinks: NavLinkItem[] = [
  { id: "home", href: "/", label: "HOME" },
  { id: "shop", href: "/shop", label: "CATALOG" },
];

export const footerInformationLinks = [
  { label: "Terms Of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Contact Us", href: "#" },
] as const;

export const footerSocialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/be.betterdvl?igsh=bzEzbjV2OTg4dTNn" },
  { label: "TikTok", href: "https://www.tiktok.com/@be.betterstd" },
] as const;

const shopCategoryDescriptions: Partial<Record<ShopFilterCategory, string>> = {
  jacket: "Insulated winter jackets & outerwear",
  snowboard: "Boards, bindings & ride gear",
  ski: "Skis, poles & mountain kits",
  goggles: "Helmets, goggles & eyewear",
};

export const shopCategoryLinks: NavLink[] = shopCategoryFilters
  .filter((item) => item.value !== "all")
  .map((item) => ({
    href: `/shop?category=${item.value}`,
    label: item.label.toUpperCase(),
    description: shopCategoryDescriptions[item.value],
  }));

export const exploreLinks: NavLink[] = [
  {
    href: "/",
    label: "HOME",
    description: "Latest drops & hero lookbook",
  },
  {
    href: "/shop",
    label: "CATALOG",
    description: "Browse catalog & limited drops",
  },
];

export const featuredNavProductSlugs = [
  "alpha-jacket",
  "sigma-down-parka",
  "phantom-snowboard",
] as const;

export { isValidShopFilterCategory as isValidShopCategory } from "@/lib/products";

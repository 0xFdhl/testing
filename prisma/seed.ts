import "dotenv/config";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local"), override: true });

import { hashSync } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_TEMPLATES } from "../src/lib/notifications/templates";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const sizingInfo = [
  "True to size. If between sizes, size up for a relaxed fit.",
  "Model is 6'1\" and wears size M.",
];

const shippingInfo = [
  "Free shipping on orders over $200.",
  "Delivery in 3–7 business days.",
  "Express shipping available at checkout.",
];

const returnsInfo = [
  "30-day return window from delivery.",
  "Items must be unworn with tags attached.",
  "Free returns for store credit. Refunds to original payment method incur a $5 restocking fee.",
];

const products = [
  {
    slug: "alpha-jacket",
    name: "Alpha Insulated Jacket",
    category: "jacket",
    price: 299_000,
    description:
      "A lightweight yet durable insulated jacket engineered for cold-weather performance. Features a water-repellent shell, thermal lining, and articulated sleeves for full mobility on the mountain.",
    images: ["/images/products/hoodie-zipp-diagonal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 10, L: 15, XL: 7 },
    badge: "Best Seller",
    colorLabel: "Black / Olive / Navy",
    fitNote: "Slim fit — size up for layering",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "sigma-down-parka",
    name: "Sigma Down Parka",
    category: "jacket",
    price: 459_000,
    description:
      "Premium down parka with 800-fill goose down and a storm-proof outer shell. Designed for extreme cold with a detachable hood, fleece-lined pockets, and adjustable hem.",
    images: ["/images/products/stella-noctis-thermal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 6, L: 10, XL: 4 },
    badge: "New",
    colorLabel: "Black / Tan / Grey",
    fitNote: "Relaxed fit — roomy for heavy layers",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "pulse-softshell",
    name: "Pulse Softshell Jacket",
    category: "jacket",
    price: 199_000,
    description:
      "Versatile softshell jacket for high-output activities. Breathable, stretch-woven fabric with a DWR finish blocks light snow and wind while keeping you comfortable on the ascent.",
    images: ["/images/products/stella-noctis-thermal-1.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 5, S: 8, M: 15, L: 12, XL: 6 },
    colorLabel: "Grey / Blue / Red",
    fitNote: "Regular fit — true to size",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },

  {
    slug: "phantom-snowboard",
    name: "Phantom Snowboard",
    category: "snowboard",
    price: 549_000,
    description:
      "An all-mountain freestyle snowboard with a true twin shape and medium flex. Sintered base for speed, poplar core for snap, and carbon stringers for stability at high speed.",
    images: ["/images/products/ashley-thermal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 5, L: 8, XL: 3 },
    badge: "Popular",
    colorLabel: "Black / White / Red",
    fitNote: "Board size chart: M (152cm), L (156cm), XL (160cm)",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "apex-splitboard",
    name: "Apex Splitboard",
    category: "snowboard",
    price: 729_000,
    description:
      "Built for backcountry touring. Camber profile underfoot provides edge hold on firm snow, while the rockered tips keep you floating in powder. Includes hardware and split-specific bindings.",
    images: ["/images/products/asuka-thermal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 4, L: 6, XL: 2 },
    colorLabel: "Camo / Black",
    fitNote: "See size chart. M (154cm), L (158cm), XL (162cm)",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "drift-snowboard-boots",
    name: "Drift Snowboard Boots",
    category: "snowboard",
    price: 259_000,
    description:
      "Heat-moldable liner, BOA lacing system, and a medium-stiff flex for all-mountain riding. Vibram outsole grips icy parking lots and the cushioned insole absorbs hard landings.",
    images: ["/images/products/rem-boxy-tshirt.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 12, L: 10, XL: 5 },
    badge: "Eco",
    colorLabel: "Black / Dark Grey",
    fitNote: "True to sneaker size. Heat molding available in-store.",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },

  {
    slug: "vector-skis",
    name: "Vector All-Mountain Skis",
    category: "ski",
    price: 649_000,
    description:
      "A versatile all-mountain ski with a 95mm waist, titanal laminate for dampening, and a early-rise tip for effortless turn initiation. Equally at home on groomers and in moguls.",
    images: ["/images/products/hoodie-zipp-diagonal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 6, L: 9, XL: 4 },
    badge: "Staff Pick",
    colorLabel: "White / Black / Orange",
    fitNote: "Length: M (168cm), L (176cm), XL (184cm)",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "summit-ski-boots",
    name: "Summit Ski Boots",
    category: "ski",
    price: 379_000,
    description:
      "Performance ski boots with a 120 flex index, GripWalk soles, and a fully customizable thermo-formable liner. Micro-adjustable buckles let you dial in the fit on the fly.",
    images: ["/images/products/stella-noctis-thermal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 8, L: 10, XL: 3 },
    colorLabel: "Black / Carbon",
    fitNote: "Mondo sizing. Heat molding recommended for best fit.",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "ridge-ski-poles",
    name: "Ridge Ski Poles",
    category: "ski",
    price: 79_000,
    description:
      "Lightweight 7075 aluminum poles with a contoured cork grip and adjustable strap. The tapered tip penetrates firm snow easily. Sold as a pair.",
    images: ["/images/products/stella-noctis-thermal-1.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 15, S: 12, M: 20, L: 15, XL: 10 },
    colorLabel: "Black / Silver / Red",
    fitNote: "Height-based sizing included in product guide.",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },

  {
    slug: "orbit-goggles",
    name: "Orbit Photochromic Goggles",
    category: "goggles",
    price: 189_000,
    description:
      "Photochromic lenses that adapt from CAT 1 to CAT 3 coverage, so you never have to swap lenses from dawn to dusk. Anti-fog coating and a comfortable triple-layer face foam.",
    images: ["/images/products/ashley-thermal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 5, M: 14, L: 12, XL: 6 },
    badge: "New",
    colorLabel: "Black / White / Neon",
    fitNote: "Fits medium to large faces. Helmet-compatible.",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "cascade-helmet",
    name: "Cascade MIPS Helmet",
    category: "goggles",
    price: 229_000,
    description:
      "In-mold construction with MIPS protection system reduces rotational forces on impact. 14 adjustable vents, a Fidlock magnetic buckle, and a removable ear pad design.",
    images: ["/images/products/asuka-thermal.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 0, S: 0, M: 10, L: 10, XL: 5 },
    colorLabel: "Matte Black / White / Grey",
    fitNote: "Adjustable dial fit system. M (55–58cm), L (59–62cm), XL (62–65cm)",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
  {
    slug: "frost-lens-kit",
    name: "Frost Lens Kit",
    category: "goggles",
    price: 49_000,
    description:
      "Interchangeable lens kit for the Orbit frame. Includes a CAT 0 clear lens for night riding and a CAT 4 mirror lens for extreme sun. Microfiber carry pouch included.",
    images: ["/images/products/rem-boxy-tshirt.webp"],
    sizes: ["M", "L", "XL"],
    stock: { XS: 20, S: 15, M: 25, L: 20, XL: 10 },
    badge: "Sale",
    colorLabel: "Clear / Gold Mirror",
    fitNote: "Compatible with Orbit Goggles only.",
    sizingInfo,
    shippingInfo,
    returnsInfo,
  },
];

async function main() {
  console.log("Seeding admin user...");

  const adminEmail = "admin@yourbrand.com";
  const adminPassword = "admin123";
  const passwordHash = hashSync(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: "Super Admin" },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Super Admin",
      role: "SUPERADMIN",
    },
  });
  console.log(`  ✓ Admin user — ${adminEmail} / ${adminPassword}`);

  console.log("Seeding products...");

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
    console.log(`  ✓ ${p.slug} — ${p.name} (${p.category})`);
  }

  console.log("Seeding orders...");

  const customerPool = [
    { name: "Andi Pratama", email: "andi@email.com", phone: "081234567890" },
    { name: "Budi Santoso", email: "budi@email.com", phone: "081298765432" },
    { name: "Citra Dewi", email: "citra@email.com", phone: "082134567890" },
    { name: "Dian Kusuma", email: "dian@email.com", phone: "082156789012" },
    { name: "Eko Wijaya", email: "eko@email.com", phone: "083178901234" },
    { name: "Fitri Handayani", email: "fitri@email.com", phone: "083189012345" },
    { name: "Gilang Permana", email: "gilang@email.com", phone: "085190123456" },
    { name: "Hana Safira", email: "hana@email.com", phone: "085201234567" },
    { name: "Irfan Maulana", email: "irfan@email.com", phone: "086212345678" },
    { name: "Joko Susilo", email: "joko@email.com", phone: "086223456789" },
  ];

  const allProducts = await prisma.product.findMany();

  function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const orderStatuses: Array<{
    status: "PAID" | "PENDING" | "EXPIRED" | "CANCELLED";
    weight: number;
  }> = [
    { status: "PAID", weight: 60 },
    { status: "PENDING", weight: 15 },
    { status: "EXPIRED", weight: 10 },
    { status: "CANCELLED", weight: 15 },
  ];

  function pickStatus(): "PAID" | "PENDING" | "EXPIRED" | "CANCELLED" {
    const totalWeight = orderStatuses.reduce((s, o) => s + o.weight, 0);
    let r = Math.random() * totalWeight;
    for (const entry of orderStatuses) {
      r -= entry.weight;
      if (r <= 0) return entry.status;
    }
    return "PAID";
  }

  function hoursAgo(h: number): Date {
    const d = new Date();
    d.setHours(d.getHours() - h);
    return d;
  }

  const totalOrders = 35;

  for (let i = 0; i < totalOrders; i++) {
    const customer = randomItem(customerPool);
    const product = randomItem(allProducts);
    const qty = randomInt(1, 3);
    const size = randomItem(product.sizes as string[]);
    const lineItems = [
      {
        productSlug: product.slug,
        productName: product.name,
        size,
        quantity: qty,
        unitPrice: product.price,
      },
    ];
    const amount = product.price * qty;

    const status = pickStatus();
    const createdAt = hoursAgo(randomInt(1, 720));
    const paidAt = status === "PAID" ? new Date(createdAt.getTime() + randomInt(5, 120) * 60000) : null;
    const expiredAt = status === "EXPIRED" ? new Date(createdAt.getTime() + 24 * 3600 * 1000) : null;
    const cancelledAt = status === "CANCELLED" ? new Date(createdAt.getTime() + randomInt(5, 60) * 60000) : null;

    const externalId = `ORD-SEED-${i.toString().padStart(3, "0")}-${Date.now().toString(36)}`;

    await prisma.order.upsert({
      where: { externalId },
      update: {
        status,
        lineItems: lineItems as object,
        amount,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        paidAt,
        expiredAt,
        cancelledAt,
        createdAt,
      },
      create: {
        externalId,
        status,
        lineItems: lineItems as object,
        amount,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        paidAt,
        expiredAt,
        cancelledAt,
        createdAt,
      },
    });
  }

  console.log(`  ✓ ${totalOrders} orders seeded`);

  console.log("Seeding notification templates...");

  for (const [event, template] of Object.entries(DEFAULT_TEMPLATES)) {
    await prisma.notificationTemplate.upsert({
      where: { event },
      update: {},
      create: {
        event,
        title: template.title,
        message: template.message,
        sound: template.sound ?? null,
      },
    });
    console.log(`  ✓ ${event}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

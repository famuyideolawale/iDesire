import { randomBytes } from "node:crypto";
import { products as fabrics } from "../products";
import { giftProducts } from "../gift-data";
import type {
  Brand,
  BusinessData,
  CmsBlock,
  CmsPage,
  LocalProduct,
  StoreDatabase,
} from "./types";
const now = () => new Date().toISOString();
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
const templateBlock: CmsBlock = {
  id: "designed-template",
  type: "template",
  title: "Designed page & functional tools",
  body: "",
  image: "",
  alt: "",
  buttonLabel: "",
  href: "",
  visible: true,
};
const idesirePages = [
  ["home", "Homepage", "/"],
  ["shop", "Shop", "/shop"],
  ["new", "New arrivals", "/new"],
  ["about", "Our story", "/about"],
  ["contact", "Contact", "/contact"],
  ["wedding-orders", "Wedding orders", "/wedding-orders"],
  ["customisation", "Customisation", "/customisation"],
  ["track-order", "Order tracking", "/track-order"],
  ["cart", "Shopping bag", "/cart"],
  ["account", "Customer account", "/account"],
  ["product", "Product template", "/product/[slug]"],
];
const giftPages = [
  ["home", "Homepage", "/kokies-world-of-gift"],
  ["shop", "Gift shop", "/kokies-world-of-gift/shop"],
  [
    "corporate-gifts",
    "Corporate gifting",
    "/kokies-world-of-gift/corporate-gifts",
  ],
  [
    "personalisation",
    "Personalisation",
    "/kokies-world-of-gift/personalisation",
  ],
  ["about", "Our story", "/kokies-world-of-gift/about"],
  ["contact", "Contact", "/kokies-world-of-gift/contact"],
  ["help", "Ordering & FAQs", "/kokies-world-of-gift/help"],
  ["track-order", "Order tracking", "/kokies-world-of-gift/track-order"],
  ["cart", "Gift bag", "/kokies-world-of-gift/cart"],
  ["account", "Customer account", "/kokies-world-of-gift/account"],
  ["product", "Product template", "/kokies-world-of-gift/[id]"],
];
export function seedBusiness(brand: Brand): BusinessData {
  const isGift = brand === "kokies";
  const products: LocalProduct[] = isGift
    ? giftProducts.map((p) => ({
        id: String(p.id),
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: p.price,
        image: p.image,
        description: p.note,
        minimum: 100,
        unit: "unit",
        status: "published",
        sample: p.sample,
        sourceUrl: p.sourceUrl,
      }))
    : fabrics.map((p) => ({
        id: p.slug,
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: p.price ?? null,
        image: p.image,
        description: p.description,
        minimum: p.minimumYards ?? 5,
        unit: "yard",
        status: "published",
        sample: p.sample,
        colours: p.colours,
        yardOptions: p.yardOptions,
        label: p.label,
        sourceUrl: p.sourceUrl,
      }));
  const extras: [string, string, number, string, number][] = isGift ? [
    ["Executive Welcome Box", "Corporate Gifts", 48000, "celebration-gift-set.png", 50],
    ["Conference Desk Kit", "Stationery", 16500, "branded-notebooks.png", 100],
    ["Wedding Keepsake Tumblers", "Wedding Gifts", 19500, "anniversary-tumblers.png", 100],
    ["Birthday Hydration Gift", "Birthday Gifts", 14500, "colourful-bottles.png", 25],
    ["Branded Travel Flask", "Drinkware", 24500, "personalised-flasks.png", 100],
    ["Event Charging Essentials", "Tech Gifts", 26000, "multifunction-cable-gift-set.png", 250],
    ["Champagne Gift Packaging", "Packaging", 8500, "celebration-gift-set.png", 50],
    ["Executive Clock Presentation", "Luxury Gifts", 76000, "wooden-pendulum-clock.png", 20],
    ["Expo Tumbler Programme", "Promotional Items", 21000, "corporate-tumblers.png", 500],
  ] : [
    ["Champagne Petal Lace", "Occasion Lace", 32000, "embellished-lace-champagne-gold.webp", 5],
    ["Powder Blue Evening Sequin", "Evening Fabrics", 28500, "sequin-lace-powder-blue.webp", 5],
    ["Ivory Bridal Sequin", "Bridal Fabrics", 34500, "sequin-lace-white.webp", 5],
    ["Navy Garden Embroidery", "Occasion Lace", 39500, "royal-bloom-navy.webp", 5],
    ["Sage Celebration Lace", "Asoebi", 42000, "embellished-lace-sage-green.webp", 5],
  ];
  for (const [index, [name, category, price, image, minimum]] of extras.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    products.push({
      id: isGift ? "gift-" + slug : slug, slug, name, category, collection: category,
      sku: (isGift ? "KOK" : "IDT") + "-SAMPLE-" + (index + 1), price,
      image: (isGift ? "/kokies/" : "/products/") + image,
      description: isGift ? "Made to order for your occasion. Tell us your quantity and wording, and we will confirm finish, packaging, lead time and price in your quote." :
        "A made-to-order fabric selection. Tell us your colours and quantity, and we will confirm the finish, available length and price.",
      minimum, unit: isGift ? "unit" : "yard", status: "published", sample: true,
      availability: index % 3 === 0 ? "preorder" : "made",
      customisation: isGift ? (index === 6 ? "none" : index % 2 ? "branded" : "personalised") : "none",
      leadTime: isGift ? "7–14 working days after approval" : "Confirm with the fabric team",
      featured: index === 0, newArrival: index < 3,
    });
  }
  const names = isGift
    ? [
        "Adaobi Mensah",
        "Tunde Akinyemi",
        "Grace Nnamdi",
        "Kemi Balogun",
        "Ifeoma Eze",
        "David Oluwole",
        "Zara Usman",
        "Femi Okoro",
      ]
    : [
        "Amara Okafor",
        "Tomi Adeyemi",
        "Chidinma Eze",
        "Bisi Akinola",
        "Mariam Yusuf",
        "Nneka Obi",
        "Sade Williams",
        "Amina Bello",
      ];
  const customers = names.map((name, i) => ({
    id: `CUS-${brand}-${i + 1}`,
    name,
    email: `${brand}.customer${i + 1}@example.test`,
    phone: `0800000${String((isGift ? 2000 : 1000) + i).padStart(4, "0")}`,
    city: ["Abuja", "Lagos", "Ibadan", "Port Harcourt"][i % 4],
    notes: [
      "Prefers a WhatsApp follow-up.",
      "Planning an event in December.",
      "Repeat demonstration customer.",
    ][i % 3],
    tags: [i < 2 ? "VIP" : "New customer"],
    createdAt: ago(40 - i * 3),
    demo: true,
  }));
  const inventory = products.map((p, i) => ({
    productId: p.id,
    stock: p.sample
      ? 0
      : isGift
        ? [1600, 800, 2200, 900, 1400, 600, 1800, 220][i % 8]
        : [500, 320, 180, 650, 420, 280, 540][i % 7],
    reserved: 0,
    threshold: isGift ? 150 : 25,
    movements: [
      {
        id: `MOV-${brand}-${i}`,
        at: ago(10),
        quantity: p.sample ? 0 : isGift ? 1000 : 300,
        reason: "Opening demonstration stock",
        actor: "Demo setup",
      },
    ],
  }));
  const statuses = [
    "Awaiting quotation",
    "Awaiting payment",
    "Paid",
    "Processing",
    "Ready for dispatch",
    "Dispatched",
    "Completed",
    "Completed",
    "Awaiting quotation",
    "Cancelled",
    "Processing",
    "Awaiting payment",
  ] as const;
  const orders = [...statuses, ...(isGift ? (["Awaiting quotation", "Ready for dispatch", "Completed"] as const) : [])].map((status, i) => {
    const p = products[i % Math.min(products.length, isGift ? 8 : 7)],
      c = customers[i % customers.length],
      quantity = isGift ? ((i % 3) + 1) * 100 : ((i % 4) + 1) * 5;
    return {
      id: `${isGift ? "KWG" : "IDT"}-DEMO-${String(i + 1).padStart(4, "0")}`,
      customerName: c.name,
      phone: c.phone,
      email: c.email,
      address: `Demonstration delivery, ${c.city}`,
      items: [
        {
          productId: p.id,
          name: p.name,
          quantity,
          unitPrice: p.price,
          image: p.image,
        },
      ],
      total: (p.price ?? 0) * quantity,
      status,
      paymentStatus: ([
        "Paid",
        "Processing",
        "Ready for dispatch",
        "Dispatched",
        "Completed",
      ].includes(status)
        ? "Paid"
        : "Unpaid") as "Paid" | "Unpaid",
      source: (["Website", "WhatsApp", "Admin", "Manual"] as const)[i % 4],
      notes: isGift
        ? "Sample personalisation: event name and gift presentation to confirm."
        : "Sample wedding/group fabric order. Colours confirmed with the customer.",
      createdAt: ago(Math.max(0, 12 - i) + 0.05 * (15 - i)),
      updatedAt: ago(Math.max(0, 5 - i)),
      history: [
        {
          at: ago(Math.max(0, 12 - i) + 0.05 * (15 - i)),
          actor: "Demo setup",
          text: "Demonstration order created",
        },
        {
          at: ago(Math.max(0, 5 - i)),
          actor: "Demo manager",
          text: `Status: ${status}`,
        },
      ],
      reserved: false,
      demo: true,
    };
  });
  for (const inv of inventory) inv.movements[0].quantity = inv.stock;
  for (const order of orders) {
    if (
      order.items.some((item) => item.unitPrice === null) &&
      !["Cancelled", "Completed"].includes(order.status)
    )
      { order.status = "Awaiting quotation"; order.paymentStatus = "Unpaid"; }
    if (
      ["Awaiting payment", "Paid", "Processing", "Ready for dispatch"].includes(
        order.status,
      )
    ) {
      for (const item of order.items) {
        const inv = inventory.find((i) => i.productId === item.productId)!;
        inv.reserved += item.quantity;
        inv.movements.unshift({
          id: `RES-${order.id}`,
          at: order.createdAt,
          quantity: -item.quantity,
          reason: `Reserved for ${order.id}`,
          actor: "Demo setup",
        });
      }
      order.reserved = true;
    }
  }
  const enquiries = customers.slice(0, 6).map((c, i) => ({
    id: `ENQ-${brand}-DEMO-${i + 1}`,
    customerName: c.name,
    phone: c.phone,
    email: c.email,
    type: isGift
      ? ["Corporate gifting", "Wedding souvenirs", "Personalised gifts"][i % 3]
      : ["Asoebi group order", "Wedding order", "Custom colours"][i % 3],
    details: isGift
      ? `${100 + i * 50} gifts for a December event. Please suggest personalisation and packaging options.`
      : `${25 + i * 10} yards for an upcoming family celebration. Interested in wine and champagne.`,
    status: ["New", "Contacted", "Quote sent", "Awaiting response"][i % 4],
    createdAt: ago(6 - i),
    demo: true,
  }));
  const pages: CmsPage[] = (isGift ? giftPages : idesirePages).map(
    ([id, name, path]) => {
      const content = {
        title: "",
        intro: "",
        seoTitle: "",
        seoDescription: "",
        blocks: [{ ...templateBlock }],
      };
      return {
        id,
        name,
        path,
        protected: [
          "cart",
          "track-order",
          "account",
          "product",
          "contact",
          "wedding-orders",
        ].includes(id),
        draft: structuredClone(content),
        published: structuredClone(content),
        updatedAt: now(),
        publishedAt: now(),
        versions: [],
      };
    },
  );
  const conversations = customers.slice(0, 4).map((c, i) => ({
    id: `CHAT-${brand}-DEMO-${i + 1}`,
    visitorHash: "demo-" + randomBytes(20).toString("hex"),
    name: c.name,
    email: c.email,
    status: (i === 0 ? "Waiting" : i === 3 ? "Resolved" : "Open") as
      "Waiting" | "Open" | "Resolved",
    assignedTo: i === 0 ? "" : "Demo manager",
    tags: [isGift ? "Personalisation" : "Wedding order"],
    messages: [
      {
        id: `MSG-${brand}-${i}-1`,
        from: "visitor" as const,
        text: isGift
          ? "Hello, can you customise gifts for 150 guests?"
          : "Hello, can you help me coordinate fabrics for my wedding party?",
        at: ago(i),
      },
      {
        id: `MSG-${brand}-${i}-2`,
        from: "staff" as const,
        text: isGift
          ? "Of course. Please share your occasion, preferred gift and required date."
          : "We can help. What colours and quantities are you considering?",
        at: ago(i),
        staffName: "Demo manager",
      },
      ...(i === 0
        ? [
            {
              id: `MSG-${brand}-${i}-3`,
              from: "visitor" as const,
              text: "Please send me a few options and a quote.",
              at: now(),
            },
          ]
        : []),
    ],
    createdAt: ago(i + 1),
    updatedAt: i === 0 ? now() : ago(i),
    unread: i === 0 ? 1 : 0,
    demo: true,
  }));
  return {
    revision: 1,
    products,
    inventory,
    orders,
    enquiries,
    customers,
    pages,
    conversations,
    settings: {
      heroTitle: isGift
        ? "Good gifts. Great connections."
        : "Make an entrance.",
      heroText: isGift
        ? "Personalised gifts for your people, your business and life’s big moments."
        : "Statement fabrics for unforgettable celebrations.",
      announcement: isGift
        ? "Celebrating life, one event at a time."
        : "The new Asoebi edit",
      email: isGift ? "kokiesworldofgifts@yahoo.com" : "idesiretrads@gmail.com",
      phone: isGift ? "2349099591993" : "2348091142201",
      instagram: isGift
        ? "https://www.instagram.com/kokiesworldofgifts/"
        : "https://www.instagram.com/idesiretradsng/",
      address: isGift
        ? "Contact the Kokies team to arrange collection."
        : "CF097 Patience Jonathan Block, Wuye Ultramodern Market, Abuja",
      openingHours: "Monday–Saturday, 9am–5pm",
      chatWelcome: isGift
        ? "Welcome to Kokies. How can we help with your gifts?"
        : "Welcome to iDesire. How can we help with your fabrics?",
      chatOnline: true,
    },
    media: products.map((p) => ({
      id: `MEDIA-${p.id}`,
      src: p.image,
      name: p.name,
      alt: p.name,
      createdAt: now(),
    })),
    audit: [
      {
        id: `AUD-${brand}-setup`,
        at: now(),
        actor: "Local setup",
        action: "Created demonstration workspace",
        entity: brand,
      },
    ],
    subscribers: customers
      .slice(0, 3)
      .map((c) => ({ id: `SUB-${c.id}`, email: c.email, createdAt: ago(5) })),
  };
}
export function seedDatabase(): StoreDatabase {
  return {
    version: 1,
    businesses: {
      idesire: seedBusiness("idesire"),
      kokies: seedBusiness("kokies"),
    },
    users: [],
  };
}

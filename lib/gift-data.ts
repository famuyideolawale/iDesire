import type { GiftPersonalisation } from "./personalisation";
export type GiftProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  note: string;
  slug: string;
  sample?: boolean;
  sourceUrl?: string;
  minimum?: number;
  quoteOnly?: boolean;
};
export const sampleGiftProducts: GiftProduct[] = [
  {
    id: 9,
    name: "Customised Lunch Bag",
    category: "Event Souvenirs",
    price: 16000,
    image: "/kokies/concepts/custom-lunch-bag.webp",
    note: "Sample gift product inspired by Kokies’ customised lunch-bag souvenirs. A finished reusable insulated lunch bag with a personalised front panel. Image is illustrative; colours, finish, stock and demo price need confirmation.",
    slug: "customised-lunch-bag",
    sample: true,
    sourceUrl: "https://www.instagram.com/kokiesworldofgifts/reel/DdrmqpPNWzl/",
  },
  {
    id: 10,
    name: "Insulated Event Cooler",
    category: "Gift & Home Essentials",
    price: 28000,
    image: "/kokies/concepts/insulated-event-cooler.webp",
    note: "Sample gift product inspired by Kokies’ insulated cooler collection. A practical completed cooler bag for event appreciation packages, wedding souvenirs and corporate gifting. Illustrative image; final dimensions, availability and demo price require confirmation.",
    slug: "insulated-event-cooler",
    sample: true,
    sourceUrl: "https://www.instagram.com/kokiesworldofgifts/p/DVTclP_jZoJ/",
  },
  {
    id: 11,
    name: "Tech & Flask Souvenir Set",
    category: "Tech Gift Sets",
    price: 45000,
    image: "/kokies/concepts/tech-souvenir-set.webp",
    note: "Sample gift product inspired by Kokies’ event souvenir packs: a flask, wireless earbuds, foldable phone stand and gift presentation. Image is illustrative; exact contents, stock, personalisation and demo pricing require a confirmed quote.",
    slug: "tech-flask-souvenir-set",
    sample: true,
    sourceUrl: "https://www.instagram.com/kokiesworldofgifts/reel/DbQj5OutPmJ/",
  },
];
export const giftProducts: GiftProduct[] = [
  {
    id: 1,
    name: "60W Multifunction Cable Gift Set",
    category: "Tech & Utility Gifts",
    price: 18500,
    image: "/kokies/multifunction-cable-gift-set.png",
    note: "A compact multi-cable charging set, suitable for practical gifting and event giveaways.",
    slug: "cable-gift-set",
  },
  {
    id: 2,
    name: "Personalised Celebration Tumblers",
    category: "Personalised Drinkware",
    price: 22000,
    image: "/kokies/anniversary-tumblers.png",
    note: "Colourful insulated tumblers with a name, milestone or celebration message.",
    slug: "celebration-tumblers",
  },
  {
    id: 3,
    name: "Branded Notebook & Pen Set",
    category: "Corporate Gifts",
    price: 17500,
    image: "/kokies/branded-notebooks.png",
    note: "A coordinated notebook and pen gift for teams, conferences and professional events.",
    slug: "notebook-pen-set",
  },
  {
    id: 4,
    name: "Celebration Gift Bag Set",
    category: "Event Gifts & Souvenirs",
    price: 35000,
    image: "/kokies/celebration-gift-set.png",
    note: "A curated presentation featuring branded bags and useful keepsakes for a special occasion.",
    slug: "gift-bag-set",
  },
  {
    id: 5,
    name: "Colour Pop Stainless Bottle",
    category: "Drinkware",
    price: 12500,
    image: "/kokies/colourful-bottles.png",
    note: "Reusable stainless-steel bottles available as a gift concept for groups and events.",
    slug: "stainless-bottle",
  },
  {
    id: 6,
    name: "Personalised Flask Set",
    category: "Executive Gifts",
    price: 24000,
    image: "/kokies/personalised-flasks.png",
    note: "Metal flasks with custom names or short messages for personal and corporate gifting.",
    slug: "personalised-flasks",
  },
  {
    id: 7,
    name: "Corporate Tumbler Collection",
    category: "Branded Corporate Gifts",
    price: 19500,
    image: "/kokies/corporate-tumblers.png",
    note: "Reusable tumblers presented in a coordinated colour range, with branding options to discuss.",
    slug: "corporate-tumblers",
  },
  {
    id: 8,
    name: "Classic Pendulum Clock Gift",
    category: "Premium Keepsakes",
    price: 65000,
    image: "/kokies/wooden-pendulum-clock.png",
    note: "A statement keepsake idea for recognition, anniversaries and milestone celebrations.",
    slug: "pendulum-clock",
  },
  ...sampleGiftProducts,
];
export const giftSettings = {
  heroTitle: "Good gifts. Great connections.",
  heroText:
    "Personalised gifts for your people, your business and life’s big moments.",
  instagram: "https://www.instagram.com/kokiesworldofgifts/",
};
export type GiftSettings = typeof giftSettings;
export type GiftOrder = {
  reference: string;
  business: string;
  product: string;
  quantity: number;
  unitPrice: number;
  estimatedTotal: number;
  customerName: string;
  phone: string;
  event: string;
  customisation: string;
  personalisation?: GiftPersonalisation;
  status: string;
  createdAt: string;
};

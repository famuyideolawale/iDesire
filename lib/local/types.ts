export type Brand = "idesire" | "kokies";
export const brandNames: Record<Brand, string> = {
  idesire: "iDesire TRADS",
  kokies: "Kokies World of Gifts",
};
export const orderStatuses = [
  "Awaiting quotation",
  "Awaiting payment",
  "Paid",
  "Processing",
  "Ready for dispatch",
  "Dispatched",
  "Completed",
  "Cancelled",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type LocalProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number | null;
  image: string;
  description: string;
  minimum: number;
  unit: "yard" | "unit";
  status: "published" | "draft";
  sample?: boolean;
  priceConfirmed?: boolean;
  sku?: string;
  collection?: string;
  sizes?: string[];
  relatedIds?: string[];
  salePrice?: number | null;
  maximum?: number;
  availability?: "stock" | "made" | "preorder";
  leadTime?: string;
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
  newArrival?: boolean;
  customisation?: "none" | "personalised" | "branded";

  gallery?: { src: string; label: string }[];
  colours?: { name: string; slug: string; hex: string; image: string }[];
  yardOptions?: number[];
  label?: string;
  sourceUrl?: string;
};
export function effectivePrice(product: LocalProduct) {
  return product.salePrice ?? product.price;
}
export type OrderLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  image: string;
  colour?: string;
  size?: string;
  personalisation?: Record<string, unknown>;
};
export type OrderAsset = { file: string; contentType: string };
export type LocalOrder = {
  id: string;
  customerName: string;
  deliveryMethod?: "delivery" | "pickup";
  phone: string;
  email: string;
  address: string;
  items: OrderLine[];
  total: number;
  status: OrderStatus;
  paymentStatus: "Unpaid" | "Paid";
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  history: { at: string; actor: string; text: string }[];
  reserved: boolean;
  holdUntil?: string;
  checkoutKeyHash?: string;
  customerAccountId?: string;
  checkoutFingerprint?: string;
  quoteRequired?: boolean;
  artwork?: OrderAsset;
  proof?: OrderAsset & { id: string; uploadedAt: string; approvedAt?: string };
  quoteIssuedAt?: string;
  deliveryFee?: number;
  payment?: { amount: number; reference: string; confirmedAt: string; confirmedBy: string };
  demo?: boolean;
};
export type Enquiry = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  type: string;
  details: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  demo?: boolean;
};
export type Inventory = {
  productId: string;
  stock: number;
  reserved: number;
  threshold: number;
  movements: {
    id: string;
    at: string;
    quantity: number;
    reason: string;
    actor: string;
  }[];
};
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  notes: string;
  tags: string[];
  createdAt: string;
  demo?: boolean;
};
export type ChatMessage = {
  id: string;
  from: "visitor" | "staff" | "system";
  text: string;
  at: string;
  staffName?: string;
  product?: { id: string; name: string; image: string; href: string };
};
export type Conversation = {
  id: string;
  visitorHash: string;
  name: string;
  email: string;
  phone?: string;
  status: "Waiting" | "Open" | "Resolved";
  assignedTo: string;
  tags: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  unread: number;
  demo?: boolean;
};
export type BlockType =
  "template" | "text" | "image" | "callout" | "faq" | "products" | "divider";
export type CmsBlock = {
  id: string;
  type: BlockType;
  title: string;
  body: string;
  image: string;
  alt: string;
  buttonLabel: string;
  href: string;
  visible: boolean;
};
export type CmsElement = {
  selector: string;
  scope: "page" | "site";
  kind: "text" | "image" | "link" | "button";
  text?: string;
  src?: string;
  alt?: string;
  href?: string;
  linkSelector?: string;
};
export type PageContent = {
  elements?: CmsElement[];
  title: string;
  intro: string;
  blocks: CmsBlock[];
  seoTitle: string;
  seoDescription: string;
};
export type CmsPage = {
  id: string;
  name: string;
  path: string;
  protected: boolean;
  draft: PageContent;
  published: PageContent;
  updatedAt: string;
  publishedAt: string;
  versions: { id: string; at: string; actor: string; content: PageContent }[];
};
export type HeroSlide = {
  title: string; eyebrow: string; text: string; image: string; mobileImage?: string;
  alt: string; cta: string; href: string; position?: number; visible?: boolean;
};
export type StoreSettings = {
  heroSlides?: HeroSlide[];
  heroTitle: string;
  heroText: string;
  announcement: string;
  email: string;
  phone: string;
  instagram: string;
  address: string;
  openingHours: string;
  chatWelcome: string;
  chatOnline: boolean;
};
export type Media = {
  id: string;
  src: string;
  name: string;
  alt: string;
  createdAt: string;
};
export type Audit = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
};
export type BusinessData = {
  sharedDesign?: { draft: CmsElement[]; published: CmsElement[] };
  revision: number;
  products: LocalProduct[];
  orders: LocalOrder[];
  enquiries: Enquiry[];
  customers: Customer[];
  inventory: Inventory[];
  pages: CmsPage[];
  conversations: Conversation[];
  settings: StoreSettings;
  media: Media[];
  audit: Audit[];
  subscribers: { id: string; email: string; createdAt: string }[];
};
export type PublicData = {
  sharedElements?: CmsElement[];
  previewAuthorized?: boolean;
  revision: number;
  products: LocalProduct[];
  inventory: { productId: string; available: number }[];
  pages: Pick<CmsPage, "id" | "path" | "published">[];
  settings: StoreSettings;
};
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  brands: Brand[];
  role: "Developer" | "Owner" | "Manager";
  username?: string;
  status?: "Active" | "Suspended";
  sessionVersion?: number;
  createdAt?: string;
};
export type CustomerAccount = {
  id: string; name: string; email: string; salt: string; passwordHash: string;
  sessions: { hash: string; expiresAt: number }[];
};
export type StoreDatabase = {
  customerAccounts?: Record<Brand, CustomerAccount[]>;
  version: number;
  businesses: Record<Brand, BusinessData>;
  users: (SessionUser & { salt: string; passwordHash: string })[];
};
export function productPath(brand: Brand, p: LocalProduct) {
  return brand === "idesire"
    ? `/product/${p.slug}`
    : `/kokies-world-of-gift/${p.id}`;
}
export function homePath(brand: Brand) {
  return brand === "idesire" ? "/" : "/kokies-world-of-gift";
}
export function pageKey(brand: Brand, path: string) {
  const prefix = brand === "kokies" ? "/kokies-world-of-gift" : "";
  const key = path.slice(prefix.length).replace(/^\/+|\/+$/g, "");
  return !key
    ? "home"
    : key.startsWith("product/") ||
        (brand === "kokies" &&
          ![
            "shop",
            "corporate-gifts",
            "personalisation",
            "about",
            "contact",
            "help",
            "track-order",
            "account",
            "cart",
          ].includes(key))
      ? "product"
      : key;
}

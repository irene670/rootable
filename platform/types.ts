export type StoreTheme = {
  primary: string;
  accent: string;
};

export type StoreProfile = {
  slug: string;
  storeId: string;
  name: string;
  tagline: string;
  story: string;
  announcement: string;
  address: string;
  phone: string;
  hours: string[];
  socialUrl: string;
  coverImage: string;
  logoText: string;
  gallery: string[];
  paymentMethods: string[];
  theme: StoreTheme;
};

export type ProductOption = {
  id: string;
  name: string;
  price: number;
  soldOut?: boolean;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: ProductOption[];
};

export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  imageAlt: string;
  badge?: string;
  featured?: boolean;
  soldOut?: boolean;
  availableNote?: string;
  optionGroups: ProductOptionGroup[];
};

export type StoreVersion = {
  id: string;
  createdAt: string;
  profile: StoreProfile;
  products: MenuProduct[];
};

export type StoreRecord = {
  storeId: string;
  slug: string;
  plan: "free" | "pro";
  status: "active" | "paused";
  ownerName: string;
  staff: { id: string; name: string; role: "owner" | "staff" }[];
  profile: StoreProfile;
  products: MenuProduct[];
  draftProfile: StoreProfile;
  draftProducts: MenuProduct[];
  versions: StoreVersion[];
  updatedAt: string;
};

export type Reservation = {
  id: string;
  storeId: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  note: string;
  deposit: number;
  depositStatus: "not_required" | "simulated_paid" | "refunded";
  status: "pending" | "confirmed" | "seated" | "cancelled";
  createdAt: string;
};

export type Review = {
  id: string;
  storeId: string;
  orderNo: string;
  customerName: string;
  rating: number;
  comment: string;
  merchantReply: string;
  status: "published" | "reported";
  createdAt: string;
};

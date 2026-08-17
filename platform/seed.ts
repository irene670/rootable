import type { MenuProduct, StoreProfile, StoreRecord } from "./types";

export const senriProfile: StoreProfile = {
  slug: "senri",
  storeId: "senri-demo",
  name: "森日小館",
  tagline: "把日常好好煮成一頓飯",
  story: "森日從高雄鹽埕的一張木桌開始。我們用台灣當季蔬菜、越光米與每日現做的小缽，做出可以慢慢吃、也適合每天吃的日式定食。",
  announcement: "平日 14:00–17:00 暫停供應定食；最後點餐 20:30。",
  address: "高雄市鹽埕區大勇路 88 號",
  phone: "07-531-6888",
  hours: ["週一至週五 11:30–20:30", "週六、週日 11:00–21:00"],
  socialUrl: "https://www.instagram.com/",
  coverImage: "/menu/chicken.jpg",
  logoText: "森",
  gallery: ["/menu/salmon.jpg", "/menu/rice-bowl.jpg", "/menu/matcha.jpg"],
  paymentMethods: ["現金", "LINE Pay（模擬）", "Apple Pay（模擬）"],
  theme: { primary: "#173e35", accent: "#f4a35d" },
};

const mealOptions = [
  {
    id: "rice",
    name: "飯量",
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: "rice-normal", name: "正常飯", price: 0 },
      { id: "rice-less", name: "少飯", price: 0 },
      { id: "rice-more", name: "加飯", price: 20 },
    ],
  },
  {
    id: "sides",
    name: "加點配菜",
    required: false,
    min: 0,
    max: 3,
    options: [
      { id: "egg", name: "溫泉蛋", price: 35 },
      { id: "tofu", name: "胡麻豆腐", price: 45 },
      { id: "soup", name: "味噌湯", price: 30 },
      { id: "sausage", name: "現烤香腸", price: 55, soldOut: true },
    ],
  },
  {
    id: "drink",
    name: "套餐飲品",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "tea", name: "柚香冷泡烏龍", price: 55 },
      { id: "coffee", name: "山霧美式咖啡", price: 65 },
      { id: "matcha", name: "宇治抹茶歐蕾", price: 85 },
    ],
  },
];

export const senriProducts: MenuProduct[] = [
  { id: "set-chicken", name: "炙燒照燒雞腿定食", description: "去骨雞腿、越光米、味噌湯與三樣小缽", price: 320, category: "人氣定食", image: "/menu/chicken.jpg", imageAlt: "炙燒雞腿搭配米飯與季節蔬菜", badge: "人氣 No.1", featured: true, optionGroups: mealOptions },
  { id: "set-salmon", name: "鹽麴烤鮭魚定食", description: "厚切鮭魚、越光米、味噌湯與三樣小缽", price: 360, category: "人氣定食", image: "/menu/salmon.jpg", imageAlt: "烤鮭魚、米飯與味噌湯定食", badge: "每日限量", availableNote: "每日供應至售完", optionGroups: mealOptions },
  { id: "vegetable-curry", name: "十蔬熟成咖哩飯", description: "洋蔥與蘋果慢炒，搭配當日烤時蔬", price: 280, category: "丼飯與麵", image: "/menu/curry.jpg", imageAlt: "蔬菜咖哩與白飯", badge: "微辣", optionGroups: mealOptions.slice(0, 2) },
  { id: "moon-rice", name: "月見七彩野菜丼", description: "溫泉蛋、時蔬、芝麻與日式醬汁", price: 290, category: "丼飯與麵", image: "/menu/rice-bowl.jpg", imageAlt: "鋪滿時蔬與溫泉蛋的日式丼飯", optionGroups: mealOptions },
  { id: "tofu-bowl", name: "胡麻酥豆腐野菜碗", description: "酥豆腐、毛豆、酪梨、鮮蔬與胡麻醬", price: 300, category: "丼飯與麵", image: "/menu/tofu.jpg", imageAlt: "酥豆腐、酪梨與多種鮮蔬組成的野菜碗", badge: "全素可食", optionGroups: mealOptions.slice(0, 2) },
  { id: "miso-ramen", name: "味噌豆乳野菜拉麵", description: "豆乳味噌湯底、豆腐、海苔與季節蔬菜", price: 290, category: "丼飯與麵", image: "/menu/ramen.jpg", imageAlt: "豆腐、海苔與蔬菜拉麵", badge: "可做全素", optionGroups: [{ id: "spicy", name: "辣度", required: true, min: 1, max: 1, options: [{ id: "none", name: "不辣", price: 0 }, { id: "little", name: "小辣", price: 0 }] }, ...mealOptions.slice(1)] },
  { id: "coffee", name: "山霧手沖咖啡", description: "中淺焙，柑橘、堅果與黑糖尾韻", price: 150, category: "飲品", image: "/menu/coffee.jpg", imageAlt: "木桌上的手沖黑咖啡", optionGroups: [{ id: "temp", name: "溫度", required: true, min: 1, max: 1, options: [{ id: "hot", name: "熱", price: 0 }, { id: "ice", name: "冰", price: 0 }] }] },
  { id: "matcha", name: "宇治抹茶歐蕾", description: "宇治抹茶、鮮奶，可選冰飲或熱飲", price: 170, category: "飲品", image: "/menu/matcha.jpg", imageAlt: "玻璃杯中的冰抹茶歐蕾", badge: "招牌", optionGroups: [{ id: "temp", name: "溫度", required: true, min: 1, max: 1, options: [{ id: "hot", name: "熱", price: 0 }, { id: "ice", name: "冰", price: 0 }] }, { id: "sweet", name: "甜度", required: true, min: 1, max: 1, options: [{ id: "normal", name: "正常甜", price: 0 }, { id: "half", name: "半糖", price: 0 }, { id: "none", name: "無糖", price: 0 }] }] },
  { id: "tea", name: "柚香冷泡烏龍", description: "冷泡烏龍、柚子蜜與新鮮檸檬", price: 130, category: "飲品", image: "/menu/tea.jpg", imageAlt: "陽光下加滿冰塊的冷泡茶", optionGroups: [] },
  { id: "pudding", name: "焦糖昭和布丁", description: "雞蛋、鮮奶、香草與微苦焦糖", price: 130, category: "甜點", image: "/menu/pudding.jpg", imageAlt: "玻璃杯中的手工奶香布丁", badge: "每日手作", optionGroups: [] },
  { id: "cheesecake", name: "柚香巴斯克乳酪", description: "奶油乳酪、柚子皮與海鹽鮮奶油", price: 160, category: "甜點", image: "/menu/cheesecake.jpg", imageAlt: "白色盤中的乳酪蛋糕切片", optionGroups: [] },
];

export const createSeedStore = (): StoreRecord => ({
  storeId: senriProfile.storeId,
  slug: senriProfile.slug,
  plan: "free",
  status: "active",
  ownerName: "林店長",
  staff: [
    { id: "owner-1", name: "林店長", role: "owner" },
    { id: "staff-1", name: "小安", role: "staff" },
  ],
  profile: structuredClone(senriProfile),
  products: structuredClone(senriProducts),
  draftProfile: structuredClone(senriProfile),
  draftProducts: structuredClone(senriProducts),
  versions: [],
  updatedAt: new Date().toISOString(),
});

export const seedReviews = [
  { id: "review-1", storeId: "senri-demo", orderNo: "R8321042", customerName: "陳小姐", rating: 5, comment: "雞腿外皮很香，手機加點也很快。", merchantReply: "謝謝喜歡，期待下次再為您料理。", status: "published" as const, createdAt: "2026-08-10T12:30:00.000Z" },
  { id: "review-2", storeId: "senri-demo", orderNo: "R8318755", customerName: "王先生", rating: 4, comment: "套餐份量剛好，希望甜點能再多一種。", merchantReply: "收到，我們正在測試新的季節甜點。", status: "published" as const, createdAt: "2026-08-08T10:10:00.000Z" },
];

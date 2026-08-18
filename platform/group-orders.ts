export type GroupOrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  optionLabel: string;
  image: string;
};

export type GroupOrderMember = {
  id: string;
  name: string;
  tokenHash: string;
  color: number;
  items: GroupOrderItem[];
  joinedAt: string;
  lastSeenAt: string;
};

export type GroupOrderSession = {
  code: string;
  storeId: string;
  storeSlug: string;
  tableNo: string;
  hostMemberId: string;
  status: "active" | "submitting" | "submitted";
  members: GroupOrderMember[];
  orderNo: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicGroupOrderMember = Omit<GroupOrderMember, "tokenHash"> & { isHost: boolean };
export type PublicGroupOrderSession = Omit<GroupOrderSession, "members"> & { members: PublicGroupOrderMember[] };

const encoder = new TextEncoder();
const allowedCode = /^[A-HJ-NP-Z2-9]{6}$/;

export const cleanGroupCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
export const validGroupCode = (value: string) => allowedCode.test(value);
export const cleanMemberName = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 12);
export const cleanTableNo = (value: string) => value.trim().slice(0, 12);

export async function hashGroupToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createGroupCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function createGroupMember(name: string, color = 0) {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const member: GroupOrderMember = {
    id: crypto.randomUUID(),
    name: cleanMemberName(name),
    tokenHash: await hashGroupToken(token),
    color: Math.abs(color) % 6,
    items: [],
    joinedAt: now,
    lastSeenAt: now,
  };
  return { member, token };
}

export function publicGroupSession(session: GroupOrderSession): PublicGroupOrderSession {
  return {
    ...session,
    members: session.members.map((member) => ({
      id: member.id,
      name: member.name,
      color: member.color,
      items: member.items,
      joinedAt: member.joinedAt,
      lastSeenAt: member.lastSeenAt,
      isHost: member.id === session.hostMemberId,
    })),
  };
}

export async function findGroupMember(session: GroupOrderSession, memberId: string, token: string) {
  if (!memberId || !token) return null;
  const tokenHash = await hashGroupToken(token);
  return session.members.find((member) => member.id === memberId && member.tokenHash === tokenHash) || null;
}

export function normalizeGroupItems(items: unknown): GroupOrderItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 30).flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Partial<GroupOrderItem>;
    const quantity = Math.max(1, Math.min(30, Math.round(Number(item.quantity) || 0)));
    const unitPrice = Math.max(1, Math.min(100_000, Math.round(Number(item.unitPrice) || 0)));
    const productId = String(item.productId || "").slice(0, 100);
    const productName = String(item.productName || "").trim().slice(0, 100);
    if (!productId || !productName || !quantity || !unitPrice) return [];
    return [{
      id: String(item.id || `group-item-${index}`).slice(0, 100),
      productId,
      productName,
      quantity,
      unitPrice,
      optionLabel: String(item.optionLabel || "").trim().slice(0, 120),
      image: String(item.image || "").trim().slice(0, 500),
    }];
  });
}

export function groupItemCount(session: PublicGroupOrderSession | GroupOrderSession) {
  return session.members.reduce((total, member) => total + member.items.reduce((sum, item) => sum + item.quantity, 0), 0);
}

export function groupSubtotal(session: PublicGroupOrderSession | GroupOrderSession) {
  return session.members.reduce((total, member) => total + member.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), 0);
}

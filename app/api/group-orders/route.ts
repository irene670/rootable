import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureGroupOrderSchema } from "../../../db/group-orders";
import { groupOrders } from "../../../db/schema";
import {
  cleanGroupCode,
  cleanMemberName,
  cleanTableNo,
  createGroupCode,
  createGroupMember,
  findGroupMember,
  normalizeGroupItems,
  publicGroupSession,
  validGroupCode,
  type GroupOrderSession,
} from "../../../platform/group-orders";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function readSession(code: string) {
  await ensureGroupOrderSchema();
  const [row] = await getDb().select().from(groupOrders).where(eq(groupOrders.code, code));
  return row ? JSON.parse(row.payload) as GroupOrderSession : null;
}

async function saveSession(session: GroupOrderSession, create = false) {
  const db = getDb();
  if (create) return db.insert(groupOrders).values({ code: session.code, payload: JSON.stringify(session), updatedAt: session.updatedAt }).onConflictDoNothing();
  return db.update(groupOrders).set({ payload: JSON.stringify(session), updatedAt: session.updatedAt }).where(eq(groupOrders.code, session.code));
}

export async function GET(request: Request) {
  try {
    const code = cleanGroupCode(new URL(request.url).searchParams.get("code") || "");
    if (!validGroupCode(code)) return json({ error: "請輸入六碼團體代碼" }, 400);
    const session = await readSession(code);
    return session ? json({ group: publicGroupSession(session) }) : json({ error: "找不到團體點餐" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "團體點餐暫時無法使用" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureGroupOrderSchema();
    const payload = await request.json() as { action?: string; storeId?: string; storeSlug?: string; tableNo?: string; memberName?: string; code?: string };
    if (payload.action === "create") {
      const storeId = String(payload.storeId || "").trim().slice(0, 100);
      const storeSlug = String(payload.storeSlug || "").trim().replace(/[^a-z0-9-]/g, "").slice(0, 40);
      const tableNo = cleanTableNo(String(payload.tableNo || ""));
      const memberName = cleanMemberName(String(payload.memberName || ""));
      if (!storeId || !storeSlug || !tableNo || !memberName) return json({ error: "請確認店家、桌號與您的稱呼" }, 400);
      let code = createGroupCode();
      for (let attempt = 0; attempt < 5 && await readSession(code); attempt += 1) code = createGroupCode();
      if (await readSession(code)) return json({ error: "目前無法建立團體點餐，請稍後再試" }, 503);
      const { member, token } = await createGroupMember(memberName, 0);
      const now = new Date().toISOString();
      const session: GroupOrderSession = { code, storeId, storeSlug, tableNo, hostMemberId: member.id, status: "active", members: [member], orderNo: "", createdAt: now, updatedAt: now };
      await saveSession(session, true);
      return json({ group: publicGroupSession(session), memberId: member.id, token }, 201);
    }
    if (payload.action === "join") {
      const code = cleanGroupCode(String(payload.code || ""));
      const memberName = cleanMemberName(String(payload.memberName || ""));
      if (!validGroupCode(code) || !memberName) return json({ error: "請輸入六碼團體代碼與您的稱呼" }, 400);
      const current = await readSession(code);
      if (!current) return json({ error: "找不到這桌團體點餐，請向朋友確認代碼" }, 404);
      if (current.status !== "active") return json({ error: current.status === "submitted" ? "這桌已經送出訂單" : "發起人正在結帳，暫時不能加入" }, 409);
      if (current.members.length >= 12) return json({ error: "這桌已達 12 人上限" }, 409);
      const { member, token } = await createGroupMember(memberName, current.members.length);
      const session = { ...current, members: [...current.members, member], updatedAt: new Date().toISOString() };
      await saveSession(session);
      return json({ group: publicGroupSession(session), memberId: member.id, token }, 201);
    }
    return json({ error: "團體點餐操作不正確" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "團體點餐暫時無法使用" }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as { code?: string; memberId?: string; token?: string; action?: string; items?: unknown; memberNote?: string; orderNo?: string };
    const code = cleanGroupCode(String(payload.code || ""));
    if (!validGroupCode(code)) return json({ error: "團體代碼不正確" }, 400);
    const current = await readSession(code);
    if (!current) return json({ error: "找不到團體點餐" }, 404);
    const member = await findGroupMember(current, String(payload.memberId || ""), String(payload.token || ""));
    if (!member) return json({ error: "您的團體點餐憑證已失效，請重新加入" }, 401);
    const now = new Date().toISOString();
    let session: GroupOrderSession = { ...current, updatedAt: now };
    if (payload.action === "sync_cart") {
      if (session.status !== "active") return json({ error: "這桌正在結帳，暫時不能修改餐點" }, 409);
      session = { ...session, members: session.members.map((entry) => entry.id === member.id ? { ...entry, items: normalizeGroupItems(payload.items), lastSeenAt: now } : entry) };
    } else if (payload.action === "update_member_note") {
      if (session.status !== "active") return json({ error: "這桌正在結帳，暫時不能修改備註" }, 409);
      const memberNote = String(payload.memberNote || "").trim().slice(0, 120);
      session = { ...session, members: session.members.map((entry) => entry.id === member.id ? { ...entry, note: memberNote, lastSeenAt: now } : entry) };
    } else if (payload.action === "begin_checkout") {
      if (member.id !== session.hostMemberId) return json({ error: "只有發起人可以送出整桌訂單" }, 403);
      if (session.status !== "active") return json({ error: "這桌已在結帳或已送出" }, 409);
      if (!session.members.some((entry) => entry.items.length)) return json({ error: "同桌還沒有任何餐點" }, 400);
      session = { ...session, status: "submitting" };
    } else if (payload.action === "checkout_failed") {
      if (member.id !== session.hostMemberId) return json({ error: "只有發起人可以恢復點餐" }, 403);
      session = { ...session, status: "active" };
    } else if (payload.action === "mark_submitted") {
      if (member.id !== session.hostMemberId || session.status !== "submitting") return json({ error: "團體訂單狀態不正確" }, 409);
      session = { ...session, status: "submitted", orderNo: String(payload.orderNo || "").slice(0, 30) };
    } else return json({ error: "團體點餐操作不正確" }, 400);
    await saveSession(session);
    return json({ group: publicGroupSession(session) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "團體點餐暫時無法使用" }, 500);
  }
}

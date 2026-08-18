import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
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
} from "../../platform/group-orders";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const sessions = () => getStore({ name: "rootable-group-orders", consistency: "strong" });

async function readSession(code: string) {
  return sessions().get(code, { type: "json", consistency: "strong" }) as Promise<GroupOrderSession | null>;
}

async function createSession(payload: { storeId?: string; storeSlug?: string; tableNo?: string; memberName?: string }) {
  const storeId = String(payload.storeId || "").trim().slice(0, 100);
  const storeSlug = String(payload.storeSlug || "").trim().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const tableNo = cleanTableNo(String(payload.tableNo || ""));
  const memberName = cleanMemberName(String(payload.memberName || ""));
  if (!storeId || !storeSlug || !tableNo || !memberName) return json({ error: "請確認店家、桌號與您的稱呼" }, 400);
  const target = sessions();
  let code = createGroupCode();
  for (let attempt = 0; attempt < 5 && await readSession(code); attempt += 1) code = createGroupCode();
  if (await readSession(code)) return json({ error: "目前無法建立團體點餐，請稍後再試" }, 503);
  const { member, token } = await createGroupMember(memberName, 0);
  const now = new Date().toISOString();
  const session: GroupOrderSession = { code, storeId, storeSlug, tableNo, hostMemberId: member.id, status: "active", members: [member], orderNo: "", createdAt: now, updatedAt: now };
  const result = await target.setJSON(code, session, { onlyIfNew: true });
  if (!result.modified) return json({ error: "團體代碼重複，請重新建立" }, 409);
  return json({ group: publicGroupSession(session), memberId: member.id, token }, 201);
}

async function joinSession(payload: { code?: string; memberName?: string }) {
  const code = cleanGroupCode(String(payload.code || ""));
  const memberName = cleanMemberName(String(payload.memberName || ""));
  if (!validGroupCode(code) || !memberName) return json({ error: "請輸入六碼團體代碼與您的稱呼" }, 400);
  const target = sessions();
  const entry = await target.getWithMetadata(code, { type: "json", consistency: "strong" }) as { data: GroupOrderSession; etag: string } | null;
  if (!entry) return json({ error: "找不到這桌團體點餐，請向朋友確認代碼" }, 404);
  if (entry.data.status !== "active") return json({ error: entry.data.status === "submitted" ? "這桌已經送出訂單" : "發起人正在結帳，暫時不能加入" }, 409);
  if (entry.data.members.length >= 12) return json({ error: "這桌已達 12 人上限" }, 409);
  const { member, token } = await createGroupMember(memberName, entry.data.members.length);
  const session = { ...entry.data, members: [...entry.data.members, member], updatedAt: new Date().toISOString() };
  const result = await target.setJSON(code, session, { onlyIfMatch: entry.etag });
  if (!result.modified) return json({ error: "同桌資料剛剛有更新，請再加入一次" }, 409);
  return json({ group: publicGroupSession(session), memberId: member.id, token }, 201);
}

async function updateSession(payload: { code?: string; memberId?: string; token?: string; action?: string; items?: unknown; memberNote?: string; orderNo?: string }) {
  const code = cleanGroupCode(String(payload.code || ""));
  if (!validGroupCode(code)) return json({ error: "團體代碼不正確" }, 400);
  const target = sessions();
  const entry = await target.getWithMetadata(code, { type: "json", consistency: "strong" }) as { data: GroupOrderSession; etag: string } | null;
  if (!entry) return json({ error: "找不到團體點餐" }, 404);
  const member = await findGroupMember(entry.data, String(payload.memberId || ""), String(payload.token || ""));
  if (!member) return json({ error: "您的團體點餐憑證已失效，請重新加入" }, 401);
  const now = new Date().toISOString();
  let session: GroupOrderSession = { ...entry.data, updatedAt: now };

  if (payload.action === "sync_cart") {
    if (session.status !== "active") return json({ error: "這桌正在結帳，暫時不能修改餐點" }, 409);
    session = { ...session, members: session.members.map((entryMember) => entryMember.id === member.id ? { ...entryMember, items: normalizeGroupItems(payload.items), lastSeenAt: now } : entryMember) };
  } else if (payload.action === "update_member_note") {
    if (session.status !== "active") return json({ error: "這桌正在結帳，暫時不能修改備註" }, 409);
    const memberNote = String(payload.memberNote || "").trim().slice(0, 120);
    session = { ...session, members: session.members.map((entryMember) => entryMember.id === member.id ? { ...entryMember, note: memberNote, lastSeenAt: now } : entryMember) };
  } else if (payload.action === "begin_checkout") {
    if (member.id !== session.hostMemberId) return json({ error: "只有發起人可以送出整桌訂單" }, 403);
    if (session.status !== "active") return json({ error: "這桌已在結帳或已送出" }, 409);
    if (!session.members.some((entryMember) => entryMember.items.length)) return json({ error: "同桌還沒有任何餐點" }, 400);
    session = { ...session, status: "submitting" };
  } else if (payload.action === "checkout_failed") {
    if (member.id !== session.hostMemberId) return json({ error: "只有發起人可以恢復點餐" }, 403);
    session = { ...session, status: "active" };
  } else if (payload.action === "mark_submitted") {
    if (member.id !== session.hostMemberId) return json({ error: "只有發起人可以完成送單" }, 403);
    if (session.status !== "submitting") return json({ error: "團體訂單狀態不正確" }, 409);
    session = { ...session, status: "submitted", orderNo: String(payload.orderNo || "").slice(0, 30) };
  } else {
    return json({ error: "團體點餐操作不正確" }, 400);
  }

  const result = await target.setJSON(code, session, { onlyIfMatch: entry.etag });
  if (!result.modified) return json({ error: "同桌餐點剛剛有更新，請再試一次" }, 409);
  return json({ group: publicGroupSession(session) });
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      const code = cleanGroupCode(new URL(request.url).searchParams.get("code") || "");
      if (!validGroupCode(code)) return json({ error: "請輸入六碼團體代碼" }, 400);
      const session = await readSession(code);
      return session ? json({ group: publicGroupSession(session) }) : json({ error: "找不到團體點餐" }, 404);
    }
    if (request.method === "POST") {
      const payload = await request.json() as { action?: string; storeId?: string; storeSlug?: string; tableNo?: string; memberName?: string; code?: string };
      return payload.action === "create" ? createSession(payload) : payload.action === "join" ? joinSession(payload) : json({ error: "團體點餐操作不正確" }, 400);
    }
    if (request.method === "PATCH") return updateSession(await request.json());
    return json({ error: "不支援的請求方式" }, 405);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "團體點餐暫時無法使用" }, 500);
  }
};

export const config: Config = { path: "/api/group-orders" };

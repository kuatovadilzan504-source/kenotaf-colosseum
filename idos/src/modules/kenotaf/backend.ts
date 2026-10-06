import { where, type DataItemView, type IDosGamesClient } from "@idosgames/core";
import { COL, STANDS, GUARD_NAMES, board } from "./ids";
import { getKz, patchMe, type Courier } from "./store";

// Everything the game asks of the iDosGames backend. Server rules (who may write what, the cost of a
// letter, the reward for reading one, blocked words) live in the Title's config, not here: this file
// only calls the platform and keeps the courier's numbers in sync for the UI.

type Client = IDosGamesClient;
type Json = Record<string, unknown>;

export const safe = (s: string): string => s.replace(/[^A-Za-z0-9_-]/g, "_");
const short = (a: string): string => (a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

export function walletOf(client: Client): string | null {
  const b = client.data.user.state?.Blockchain;
  const last = b?.LastWalletLogin?.Address;
  if (last) return last;
  const linked = Object.values(b?.LinkedWallets ?? {}).find((w) => w?.Address);
  return linked?.Address ?? null;
}

export const shortWallet = short;

const stampsOf = (client: Client): number =>
  client.data.user.state?.InventoryV2?.VirtualCurrencies?.Stamps?.Amount ?? 0;

/**
 * A write's response says what the collection's Economy charged and granted; the SDK's cached balance does
 * not change (checked: even a forced re-read of the inventory stays stale until the next sign-in), so the
 * courier's stamps are the login balance plus these deltas.
 */
function applyEconomy(resp: unknown): void {
  const r = resp as { AlreadyExists?: boolean; Economy?: { Grant?: { Standard?: { Entries?: Json[] } }; Consume?: { Standard?: { Entries?: Json[] } } } };
  if (!r || r.AlreadyExists || !r.Economy) return;
  const sum = (list?: Json[]) =>
    (list ?? []).filter((e) => e.CurrencyID === "Stamps").reduce((n, e) => n + Number(e.Amount ?? 0), 0);
  const delta = sum(r.Economy.Grant?.Standard?.Entries) - sum(r.Economy.Consume?.Standard?.Entries);
  const me = getKz().me;
  if (delta && me) patchMe({ stamps: Math.max(0, me.stamps + delta) });
}

/**
 * The number is the key of the courier's own record (`c<no>`): the first to write it owns it, so two
 * couriers who took the oath at the same moment cannot end up with one number — the loser moves on.
 */
async function claimNumber(client: Client, start: number, wallet: string | null): Promise<number> {
  const mine = await client.dataCollections.query(COL.couriers, { Owner: "me", Limit: 1 });
  const had = mine.ok ? (mine.data.Items as DataItemView[])[0] : undefined;
  if (had) return Number((had.Data as Json).no) || start;
  for (let n = start; n < start + 12; n++) {
    const r = await client.dataCollections.create(COL.couriers, { no: n, wallet: wallet ?? "" }, { itemID: `c${n}` });
    if (r.ok && !r.data.AlreadyExists) return n;
  }
  return start;
}

/** The oath: the courier gets a number once, by the Council's own counter. */
export async function openSession(client: Client): Promise<Courier> {
  const userId = client.auth.context?.userID ?? "";
  const wallet = walletOf(client);
  const oathId = `oath_${safe(userId)}`;
  const oath = { key: "oath", kind: "oath", wallet: wallet ?? "" };
  const ucd = await client.userCustomData.getMyUserCustomData();
  let no = ucd.ok ? Number(ucd.data.Public?.courier_no?.Value ?? 0) : 0;
  if (no > 0) {
    void client.dataCollections.create(COL.ledger, oath, { itemID: oathId });
    void client.dataCollections.create(COL.couriers, { no, wallet: wallet ?? "" }, { itemID: `c${no}` });
  } else {
    await client.dataCollections.create(COL.ledger, oath, { itemID: oathId });
    const c = await client.dataCollections.getCounter(COL.ledger, "byKey", "oath");
    no = await claimNumber(client, c.ok ? Number(c.data.Value) || 1 : 1, wallet);
    await client.userCustomData.setPublicData("courier_no", String(no));
  }
  return { no, userId, wallet, name: `Курьер №${no}`, stamps: stampsOf(client), guest: !wallet };
}

/** One entry of the Book. Idempotent per courier: the same deed is recorded once. */
export async function record(
  client: Client,
  me: Courier,
  kind: "read" | "guard" | "stand" | "exam" | "end" | "mint" | "mail",
  ref: string,
  n?: number,
): Promise<{ isNew: boolean; count: number }> {
  const key = `${kind}:${ref}`;
  const data: Json = { key, kind, ref, wallet: me.wallet ?? "" };
  if (n !== undefined) data.n = n;
  const r = await client.dataCollections.create(COL.ledger, data, { itemID: `${kind}_${safe(ref)}_${safe(me.userId)}` });
  if (!r.ok) throw new Error(r.error);
  const c = await client.dataCollections.getCounter(COL.ledger, "byKey", key);
  return { isNew: !r.data.AlreadyExists, count: c.ok ? Number(c.data.Value) : 0 };
}

export async function counter(client: Client, group: string): Promise<number> {
  const c = await client.dataCollections.getCounter(COL.ledger, "byKey", group);
  return c.ok ? Number(c.data.Value) : 0;
}

export async function submit(client: Client, id: string, score: number): Promise<void> {
  if (score <= 0) return;
  const r = await client.leaderboard.submitScore(board(id), score);
  if (!r.ok) console.warn("[kenotaf] leaderboard", id, r.error);
}

// ---------------------------------------------------------------- the Book

export interface LedgerEntry {
  id: string;
  key: string;
  kind: string;
  ref: string;
  n?: number;
  sig?: string;
  at: string;
}

export async function loadLedger(client: Client): Promise<LedgerEntry[]> {
  const r = await client.dataCollections.queryAll(COL.ledger, { Owner: "me", OrderBy: "byCreated" }, { maxItems: 400 });
  if (!r.ok) throw new Error(r.error);
  return r.data.map((it) => {
    const d = it.Data as Json;
    return { id: it.ItemID, key: String(d.key), kind: String(d.kind), ref: String(d.ref ?? ""), n: d.n as number | undefined, sig: (d.sig as string) || undefined, at: it.CreatedAt };
  });
}

export interface TopRow {
  rank: number;
  score: number;
  name: string;
  mine: boolean;
}

export async function loadBoard(client: Client, id: string, myId: string): Promise<{ rows: TopRow[]; total: number }> {
  const r = await client.leaderboard.getLeaderboard(board(id));
  if (!r.ok) throw new Error(r.error);
  const top = (r.data.TopUsers ?? []).slice(0, 25);
  const names = new Map<string, string>();
  const ids = top.map((t) => t.UserID).slice(0, 50);
  if (ids.length) {
    const p = await client.userCustomData.batchGetPublicUserCustomDataOf(ids);
    for (const row of p.ok ? p.data.Results ?? [] : []) {
      const no = row.Public?.courier_no?.Value;
      if (row.UserID && no) names.set(row.UserID, `Курьер №${no}`);
    }
  }
  return {
    total: r.data.TotalParticipants ?? top.length,
    rows: top.map((t, i) => ({
      rank: t.Rank ?? i + 1,
      score: t.Score ?? 0,
      name: names.get(t.UserID) ?? t.PublicProfile?.Username ?? "Курьер",
      mine: t.UserID === myId,
    })),
  };
}

// ---------------------------------------------------------------- letters

export interface Letter {
  id: string;
  text: string;
  no: number;
  station: string;
  at: string;
  reads?: number;
}

const toLetter = (it: DataItemView): Letter => {
  const d = it.Data as Json;
  return { id: it.ItemID, text: String(d.text ?? ""), no: Number(d.authorNo ?? 0), station: String(d.station ?? ""), at: it.CreatedAt };
};

/** Up to three letters left at this station that the courier has not read and did not write. */
export async function lettersAt(client: Client, me: Courier, station: string): Promise<{ letters: Letter[]; seen: boolean }> {
  const q = await client.dataCollections.query(COL.letters, {
    Where: [where("station", "eq", station), where("hidden", "eq", false)],
    OrderBy: "byStation",
    Limit: 40,
  });
  if (!q.ok) throw new Error(q.error);
  const all = (q.data.Items as DataItemView[]).filter((it) => it.OwnerUserID !== me.userId);
  if (!all.length) return { letters: [], seen: false };
  const read = await client.dataCollections.query(COL.reads, {
    Owner: "me",
    Where: [where("letterId", "in", all.map((i) => i.ItemID))],
    Limit: 100,
  });
  const seen = new Set(((read.ok ? read.data.Items : []) as DataItemView[]).map((i) => String((i.Data as Json).letterId)));
  const fresh = all.filter((i) => !seen.has(i.ItemID)).map(toLetter);
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = fresh[i] as Letter;
    fresh[i] = fresh[j] as Letter;
    fresh[j] = a;
  }
  return { letters: fresh.slice(0, 3), seen: fresh.length === 0 };
}

export async function writeLetter(client: Client, me: Courier, station: string, text: string): Promise<void> {
  const r = await client.dataCollections.create(COL.letters, { text, station, authorNo: me.no, authorName: me.name });
  if (!r.ok) throw new Error(r.error);
  applyEconomy(r.data);
}

export async function markRead(client: Client, me: Courier, letterId: string, authorNo: number): Promise<boolean> {
  const r = await client.dataCollections.create(COL.reads, { letterId, authorNo }, { itemID: `${safe(letterId)}_${safe(me.userId)}` });
  if (!r.ok) return false;
  applyEconomy(r.data);
  return !r.data.AlreadyExists;
}

export async function myLetters(client: Client): Promise<Letter[]> {
  const r = await client.dataCollections.query(COL.letters, { Owner: "me", OrderBy: "byCreated", Limit: 20 });
  if (!r.ok) throw new Error(r.error);
  const list = (r.data.Items as DataItemView[]).map(toLetter);
  await Promise.all(
    list.map(async (l) => {
      const c = await client.dataCollections.getCounter(COL.reads, "byLetter", l.id);
      l.reads = c.ok ? Number(c.data.Value) : 0;
    }),
  );
  return list;
}

export async function deleteLetter(client: Client, id: string): Promise<void> {
  const r = await client.dataCollections.delete(COL.letters, id);
  if (!r.ok) throw new Error(r.error);
}

// ---------------------------------------------------------------- cloud save

const SAVE_KEY = "save_v3";
export const LOCAL_SAVE = "kenotaf_save_v3";

/** Progress follows the account: the newer of the cloud and the local record wins. */
export async function restoreSave(client: Client): Promise<"cloud" | "local" | "none"> {
  const r = await client.userCustomData.getMyUserCustomData();
  const cloud = r.ok ? r.data.Private?.[SAVE_KEY]?.Value : undefined;
  const local = localStorage.getItem(LOCAL_SAVE);
  const t = (raw?: string | null): number => {
    try {
      return raw ? Number((JSON.parse(raw) as { t?: number }).t ?? 0) : 0;
    } catch {
      return 0;
    }
  };
  if (cloud && t(cloud) > t(local)) {
    localStorage.setItem(LOCAL_SAVE, cloud);
    return "cloud";
  }
  if (local && t(local) > t(cloud)) {
    void client.userCustomData.setPrivateData(SAVE_KEY, local);
    return "local";
  }
  return cloud ? "cloud" : local ? "local" : "none";
}

export async function pushSave(client: Client): Promise<void> {
  const local = localStorage.getItem(LOCAL_SAVE);
  if (!local || local.length > 60000) return;
  const r = await client.userCustomData.setPrivateData(SAVE_KEY, local);
  if (!r.ok) console.warn("[kenotaf] cloud save", r.error);
}

/** A save made before the Book existed (the itch build): its deeds are entered once, in one batch. */
export async function backfill(client: Client, me: Courier): Promise<void> {
  const flag = `kz_backfill_${me.userId}`;
  if (localStorage.getItem(flag)) return;
  let save: { loreIds?: Record<string, boolean>; bosses?: Record<string, boolean>; flags?: Record<string, unknown> } | null = null;
  try {
    const rec = JSON.parse(localStorage.getItem(LOCAL_SAVE) ?? "null") as { d?: string } | null;
    save = rec?.d ? JSON.parse(rec.d) : null;
  } catch {
    save = null;
  }
  if (!save) return;
  const ops: Array<{ kind: string; ref: string }> = [];
  for (const id of Object.keys(save.loreIds ?? {})) ops.push({ kind: "read", ref: id });
  for (const id of Object.keys(save.bosses ?? {})) if (GUARD_NAMES[id]) ops.push({ kind: "guard", ref: id });
  for (const t of Object.keys(STANDS)) if (save.flags?.[`trial_${t}`]) ops.push({ kind: "stand", ref: t });
  if (save.flags?.ending) ops.push({ kind: "end", ref: save.flags.broadcast_done ? "truth" : "door" });
  for (let i = 0; i < ops.length; i += 40) {
    await client.dataCollections.batch(
      ops.slice(i, i + 40).map((o) => ({
        Op: "Create" as const,
        Collection: COL.ledger,
        ItemID: `${o.kind}_${safe(o.ref)}_${safe(me.userId)}`,
        Data: { key: `${o.kind}:${o.ref}`, kind: o.kind, ref: o.ref, wallet: me.wallet ?? "" },
      })),
    );
  }
  const lore = Object.keys(save.loreIds ?? {}).length;
  if (lore) await submit(client, "lore", lore);
  localStorage.setItem(flag, "1");
}

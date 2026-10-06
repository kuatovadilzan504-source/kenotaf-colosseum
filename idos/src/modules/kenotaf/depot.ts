import { where, type DataItemView, type IDosGamesClient } from "@idosgames/core";
import { attributesOf, ownerOf } from "./modulenft";
import { LOCAL_SAVE, record, safe } from "./backend";
import { COL, MODULES } from "./ids";
import { setKz, type Courier, type Depot, type DepotItem } from "./store";
import { chainReader, mailToWallet, mintToWallet } from "./wallet";

// The courier's backpack modules as Core assets on Solana, and the mail that carries them between couriers.
// The platform keeps only the index (which asset is which module, who is expecting a parcel); who HOLDS a
// module is read from the chain every time, so the game follows the wallet, not the database.

type Client = IDosGamesClient;
type Json = Record<string, unknown>;

export interface Parcel {
  id: string;
  fromNo: number;
  moduleId: string;
  asset: string;
  at: string;
}

/** Modules the local save says the courier has found (the game writes its flags into localStorage). */
export function foundModules(): string[] {
  try {
    const rec = JSON.parse(localStorage.getItem(LOCAL_SAVE) ?? "null") as { d?: string } | null;
    const flags = (rec?.d ? (JSON.parse(rec.d) as { flags?: Record<string, unknown> }).flags : null) ?? {};
    return Object.keys(MODULES).filter((id) => flags[id]);
  } catch {
    return [];
  }
}

async function myAssets(client: Client): Promise<Array<{ moduleId: string; asset: string }>> {
  const r = await client.dataCollections.queryAll(COL.assets, { Owner: "me", OrderBy: "byCreated" }, { maxItems: 100 });
  if (!r.ok) throw new Error(r.error);
  return r.data.map((it) => ({ moduleId: String((it.Data as Json).moduleId), asset: String((it.Data as Json).asset) }));
}

/** Item ids are shared by every courier, so the id carries the owner: the same asset may sit in two couriers' indexes over time. */
async function saveAsset(client: Client, me: Courier, moduleId: string, asset: string): Promise<void> {
  const r = await client.dataCollections.create(COL.assets, { moduleId, asset }, { itemID: `a_${safe(asset)}_${safe(me.userId)}` });
  if (!r.ok) throw new Error(r.error);
}

/** Reads the chain: which of the courier's modules the wallet holds now. The game follows this list. */
export async function syncDepot(client: Client, me: Courier): Promise<Depot> {
  const reader = chainReader();
  const recs = await myAssets(client);
  const items: DepotItem[] = await Promise.all(
    recs.map(async (a) => {
      const owner = await ownerOf(reader, a.asset);
      return { ...a, owner, mine: !!me.wallet && owner === me.wallet };
    }),
  );
  const own = [...new Set(items.filter((i) => i.mine).map((i) => i.moduleId))];
  const lost = [...new Set(items.map((i) => i.moduleId))].filter((id) => !own.includes(id));
  const depot = { items, own, lost };
  setKz({ depot });
  return depot;
}

/** The wallet of courier № (the courier registry: the number is the key of the record). */
export async function walletOfCourier(client: Client, no: number): Promise<string | null> {
  const r = await client.dataCollections.get(COL.couriers, `c${no}`);
  const w = r.ok ? String(((r.data as unknown as { Item?: DataItemView }).Item?.Data as Json | undefined)?.wallet ?? "") : "";
  return w || null;
}

export async function mintModuleFlow(client: Client, me: Courier, moduleId: string): Promise<string> {
  const name = MODULES[moduleId];
  if (!name) throw new Error("NO_SUCH_MODULE");
  const { asset, signature } = await mintToWallet(moduleId, name, me.no, me.wallet);
  await saveAsset(client, me, moduleId, asset);
  await record(client, me, "mint", moduleId).catch((e) => console.warn("[kenotaf] ledger mint", e));
  await syncDepot(client, me);
  return signature;
}

/** The parcel notice is written first and withdrawn if the transfer fails, so a notice never outlives a lie. */
export async function sendModuleFlow(client: Client, me: Courier, moduleId: string, asset: string, toNo: number): Promise<string> {
  if (toNo === me.no) throw new Error("SELF");
  const toWallet = await walletOfCourier(client, toNo);
  if (!toWallet) throw new Error("NO_COURIER");
  if (toWallet === me.wallet) throw new Error("SELF");
  const id = `p_${safe(asset)}_${Date.now().toString(36)}`;
  const notice = await client.dataCollections.create(COL.parcels, { toNo, fromNo: me.no, moduleId, asset }, { itemID: id });
  if (!notice.ok) throw new Error(notice.error);
  let sig: string;
  try {
    sig = await mailToWallet(asset, toWallet, me.wallet);
  } catch (e) {
    void client.dataCollections.delete(COL.parcels, id);
    throw e;
  }
  void client.dataCollections.update(COL.parcels, id, { Set: { sig } });
  await record(client, me, "mail", `${moduleId}>${toNo}`).catch((e) => console.warn("[kenotaf] ledger mail", e));
  await syncDepot(client, me);
  return sig;
}

/** Parcels addressed to this courier whose asset the courier's wallet really holds now. */
export async function incomingParcels(client: Client, me: Courier): Promise<Parcel[]> {
  const q = await client.dataCollections.query(COL.parcels, { Where: [where("toNo", "eq", me.no)], OrderBy: "byTo", Limit: 30 });
  if (!q.ok) throw new Error(q.error);
  const known = new Set((await myAssets(client)).map((a) => a.asset));
  const reader = chainReader();
  const list = (q.data.Items as DataItemView[]).map((it) => {
    const d = it.Data as Json;
    return { id: it.ItemID, fromNo: Number(d.fromNo ?? 0), moduleId: String(d.moduleId), asset: String(d.asset), at: it.CreatedAt };
  });
  const held = await Promise.all(list.map(async (p) => (known.has(p.asset) ? false : (await ownerOf(reader, p.asset)) === me.wallet)));
  return list.filter((_, i) => held[i]);
}

/** Takes the module into the backpack: checked on chain (held by this wallet, written for this game). */
export async function acceptParcel(client: Client, me: Courier, p: Parcel): Promise<void> {
  const reader = chainReader();
  if ((await ownerOf(reader, p.asset)) !== me.wallet) throw new Error("NOT_HELD");
  const attrs = await attributesOf(reader, p.asset);
  if (attrs.game !== "kenotaf" || attrs.module !== p.moduleId || !MODULES[p.moduleId]) throw new Error("NOT_A_MODULE");
  await saveAsset(client, me, p.moduleId, p.asset);
  await syncDepot(client, me);
}

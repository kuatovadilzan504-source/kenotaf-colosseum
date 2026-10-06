// Anyone can check a courier's Book against the chain, without trusting this project:
//   node scripts/verify-seal.mjs <courierNo> [txSignature]
// It reads the courier's entries from the platform's ledger (readable by any signed-in account), recomputes
// the digest exactly as the game does, and — if a transaction signature is given — compares it with the
// Memo that the courier's wallet put on Solana devnet.  NS=dev_ checks the test namespace.
import { Connection } from "@solana/web3.js";
import { createIDosGamesClient, where } from "@idosgames/core";
import { digestOf, parseMemo, readMemo } from "../src/modules/kenotaf/chainlib.ts";

const [no, sig] = [Number(process.argv[2]), process.argv[3]];
if (!no) { console.error("usage: node scripts/verify-seal.mjs <courierNo> [txSignature]"); process.exit(2); }
const NS = process.env.NS || "kz_";
const client = createIDosGamesClient({ titleID: process.env.TITLE || "XV979CYC", throttleMs: 0 });
const login = await client.auth.loginWithDeviceID();
if (!login.ok) throw new Error("sign-in failed: " + login.error);

// 1. who is courier №no? (the number is a public custom-data key of each account)
const oaths = await client.dataCollections.queryAll(`${NS}ledger`, { Where: [where("kind", "eq", "oath")], OrderBy: "byKindCreated" }, { maxItems: 2000 });
if (!oaths.ok) throw new Error(oaths.error);
const owners = oaths.data.map((i) => i.OwnerUserID).filter(Boolean);
let owner = null;
for (let i = 0; i < owners.length && !owner; i += 50) {
  const r = await client.userCustomData.batchGetPublicUserCustomDataOf(owners.slice(i, i + 50));
  owner = (r.ok ? r.data.Results ?? [] : []).find((x) => Number(x.Public?.courier_no?.Value) === no)?.UserID ?? null;
}
if (!owner) { console.error(`courier №${no} not found in ${NS}ledger`); process.exit(1); }

// 2. their entries
const all = await client.dataCollections.queryAll(`${NS}ledger`, { OrderBy: "byCreated" }, { maxItems: 5000 });
if (!all.ok) throw new Error(all.error);
const mine = all.data.filter((i) => i.OwnerUserID === owner);
const keys = mine.map((i) => String(i.Data.key));
const sealedAt = mine.filter((i) => i.Data.sig).length;
const h = await digestOf(keys, no);
console.log(`courier №${no}: ${keys.length} entries, ${sealedAt} already carry a seal signature`);
console.log(`digest of their keys: ${h}`);

// 3. the chain
if (sig) {
  const memo = await readMemo(new Connection("https://api.devnet.solana.com", "confirmed"), sig);
  const m = memo ? parseMemo(memo) : null;
  if (!m) { console.error("no kenotaf memo in that transaction"); process.exit(1); }
  console.log(`memo on devnet: courier ${m.c}, ${m.n} entries, digest ${m.h}`);
  console.log(m.h === h && m.n === keys.length ? "MATCH: the Book is exactly as sealed." : "DIFFERENT: the Book has changed since this seal (new entries are normal; compare with the entry count).");
}
process.exit(0);

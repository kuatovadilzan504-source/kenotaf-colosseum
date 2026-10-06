// Smoke test of the Title's backend config with throwaway Solana wallets, against the DEV namespace
// ("dev_": owners may delete, so the script cleans up after itself). Run: node scripts/test-backend.mjs
import crypto from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { createIDosGamesClient, where } from "@idosgames/core";
import { loginWithWalletSolana } from "@idosgames/wallet";

const TITLE = process.env.TITLE || "XV979CYC";
const NS = "dev_";
const wallet = () => {
  const kp = Keypair.generate();
  const pkcs8 = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.from(kp.secretKey.slice(0, 32))]);
  const key = crypto.createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
  return { addr: kp.publicKey.toBase58(), sign: async (m) => new Uint8Array(crypto.sign(null, Buffer.from(m), key)) };
};
const login = async (existing) => {
  const w = existing || wallet();
  const client = createIDosGamesClient({ titleID: TITLE, throttleMs: 0 });
  const r = await loginWithWalletSolana({ client, networkID: "solana-devnet", walletAddress: w.addr, signMessage: w.sign });
  if (!r.ok) throw new Error("login failed " + JSON.stringify(r));
  return { client, w, uid: client.auth.context.userID };
};
let failed = 0;
const check = (label, ok, extra = "") => { console.log((ok ? "ok   " : "FAIL ") + label + (extra ? "  " + extra : "")); if (!ok) failed++; };
// the truth is the server's: sign in again with the same wallet and read the fresh state
const stamps = async (who) => (await login(who.w)).client.data.user.state?.InventoryV2?.VirtualCurrencies?.Stamps?.Amount;

const A = await login(), B = await login();
check("wallet sign-in (two couriers)", !!A.uid && !!B.uid && A.uid !== B.uid);
const start = (c) => c.data.user.state?.InventoryV2?.VirtualCurrencies?.Stamps?.Amount;
check("start with 5 stamps", start(A.client) === 5 && start(B.client) === 5);

const dc = (c) => c.dataCollections;
// (couriers keep one record per account and cannot be deleted by their owner: the test number is fixed, a rerun sees AlreadyExists for A)
const oath = await dc(A.client).create(NS + "ledger", { key: "oath", kind: "oath", wallet: A.w.addr }, { itemID: "oath_" + A.uid });
check("oath recorded", oath.ok && !oath.data.AlreadyExists);
const again = await dc(A.client).create(NS + "ledger", { key: "oath", kind: "oath", wallet: A.w.addr }, { itemID: "oath_" + A.uid });
check("same deed is idempotent", again.ok && again.data.AlreadyExists);
const cnt = await dc(A.client).getCounter(NS + "ledger", "byKey", "oath");
check("counter by key", cnt.ok && cnt.data.Value >= 1, JSON.stringify(cnt.data));

const NO = 800000 + Math.floor(Math.random() * 100000);
// courier registry: the number is the key, the first writer owns it
const c1 = await dc(A.client).create(NS + "couriers", { no: NO, wallet: A.w.addr }, { itemID: "c" + NO });
check("courier number claimed", c1.ok && !c1.data.AlreadyExists);
const c2 = await dc(B.client).create(NS + "couriers", { no: NO, wallet: B.w.addr }, { itemID: "c" + NO });
check("the same number cannot be taken twice", c2.ok && c2.data.AlreadyExists);
const c3 = await dc(B.client).get(NS + "couriers", "c" + NO);
check("another courier can look the wallet up", c3.ok && JSON.stringify(c3.data).includes(A.w.addr), JSON.stringify(c3.data).slice(0, 160));

// modules: the asset index is the owner's, counters are shared
const as = await dc(A.client).create(NS + "assets", { moduleId: "felt_soles", asset: "TestAsset1111111111111111111111111111111111" }, { itemID: "a_test" });
check("asset recorded", as.ok);
const ac = await dc(B.client).getCounter(NS + "assets", "byModule", "felt_soles");
check("module counter visible to others", ac.ok && ac.data.Value >= 1, JSON.stringify(ac.data));

// parcels: written by the sender, found by the recipient (a different account) by number
const pc = await dc(A.client).create(NS + "parcels", { toNo: NO + 1, fromNo: NO, moduleId: "felt_soles", asset: "TestAsset1111111111111111111111111111111111" }, { itemID: "p_test" });
check("parcel written", pc.ok);
const pq = await dc(B.client).query(NS + "parcels", { Where: [where("toNo", "eq", NO + 1)], OrderBy: "byTo", Limit: 10 });
check("recipient sees the parcel", pq.ok && pq.data.Items.some((i) => i.ItemID === "p_test"), pq.ok ? "" : pq.error);
const pu = await dc(A.client).update(NS + "parcels", "p_test", { Set: { sig: "x" } });
check("sender may update the notice", pu.ok);

const lb = await A.client.leaderboard.submitScore(NS + "stand_z1", 6120);
check("leaderboard score", lb.ok && lb.data.NewScore === 6120);
const top = await A.client.leaderboard.getLeaderboard(NS + "stand_z1");
check("leaderboard top", top.ok && top.data.TopUsers.length >= 1);

await A.client.userCustomData.setPrivateData("save_v3", JSON.stringify({ t: 1 }));
const got = await A.client.userCustomData.getMyUserCustomData();
check("cloud save round-trip", got.ok && got.data.Private?.save_v3?.Value === '{"t":1}');

// cleanup (dev namespace only): leaderboard entries cannot be removed, everything else can
const dels = [
  await dc(A.client).delete(NS + "parcels", "p_test"),
  await dc(A.client).delete(NS + "assets", "a_test"),
  await dc(A.client).delete(NS + "ledger", "oath_" + A.uid),
  await dc(A.client).delete(NS + "couriers", "c" + NO),
];
check("test records cleaned up", dels.every((d) => d.ok));


console.log(failed ? `\n${failed} FAILED` : "\nALL OK");
process.exit(failed ? 1 : 0);

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
const oath = await dc(A.client).create(NS + "ledger", { key: "oath", kind: "oath", wallet: A.w.addr }, { itemID: "oath_" + A.uid });
check("oath recorded", oath.ok && !oath.data.AlreadyExists);
const again = await dc(A.client).create(NS + "ledger", { key: "oath", kind: "oath", wallet: A.w.addr }, { itemID: "oath_" + A.uid });
check("same deed is idempotent", again.ok && again.data.AlreadyExists);
const cnt = await dc(A.client).getCounter(NS + "ledger", "byKey", "oath");
check("counter by key", cnt.ok && cnt.data.Value >= 1, JSON.stringify(cnt.data));

const letter = await dc(A.client).create(NS + "letters", { text: "Тест: письмо с первой станции.", station: "hub", authorNo: 1, authorName: "Курьер №1" });
check("letter posted", letter.ok);
const bad = await dc(A.client).create(NS + "letters", { text: "заходи на https://x.com", station: "hub", authorNo: 1, authorName: "x" });
check("blocked words refused", !bad.ok && /blocked/i.test(bad.error));
const lid = letter.data.Item.ItemID;
const q = await dc(B.client).query(NS + "letters", { Where: [where("station", "eq", "hub"), where("hidden", "eq", false)], OrderBy: "byStation", Limit: 20 });
check("other courier finds the letter", q.ok && q.data.Items.some((i) => i.ItemID === lid));
const rd = await dc(B.client).create(NS + "reads", { letterId: lid, authorNo: 1 }, { itemID: lid + "_" + B.uid });
check("reading is accepted", rd.ok);
const rc = await dc(A.client).getCounter(NS + "reads", "byLetter", lid);
check("readers counter", rc.ok && rc.data.Value === 1);

const lb = await A.client.leaderboard.submitScore(NS + "stand_z1", 6120);
check("leaderboard score", lb.ok && lb.data.NewScore === 6120);
const top = await A.client.leaderboard.getLeaderboard(NS + "stand_z1");
check("leaderboard top", top.ok && top.data.TopUsers.length >= 1);

await A.client.userCustomData.setPrivateData("save_v3", JSON.stringify({ t: 1 }));
const got = await A.client.userCustomData.getMyUserCustomData();
check("cloud save round-trip", got.ok && got.data.Private?.save_v3?.Value === '{"t":1}');

// cleanup (dev namespace only): leaderboard entries cannot be removed, everything else can
const dels = [
  await dc(B.client).delete(NS + "reads", rd.data.Item.ItemID),
  await dc(A.client).delete(NS + "letters", lid),
  await dc(A.client).delete(NS + "ledger", "oath_" + A.uid),
];
check("test records cleaned up", dels.every((d) => d.ok));

// last, because a second sign-in replaces the first session of the same wallet
const sb = await stamps(B), sa = await stamps(A);
check("reading a letter pays a stamp (B 5 → 6)", sb === 6, "B=" + sb);
check("posting a letter costs a stamp (A 5 → 4)", sa === 4, "A=" + sa);

console.log(failed ? `\n${failed} FAILED` : "\nALL OK");
process.exit(failed ? 1 : 0);

// Seals a fake ledger on Solana devnet with a throwaway keypair and reads the memo back from the chain.
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { digestOf, memoText, parseMemo, readMemo, sendMemo } from "../src/modules/kenotaf/chainlib.ts";

const c = new Connection("https://api.devnet.solana.com", "confirmed");
const kp = Keypair.generate();
console.log("wallet", kp.publicKey.toBase58());
const sig0 = await c.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL / 10);
const bh = await c.getLatestBlockhash();
await c.confirmTransaction({ signature: sig0, ...bh }, "confirmed");
console.log("balance", (await c.getBalance(kp.publicKey)) / LAMPORTS_PER_SOL);

const keys = ["oath", "read:1", "read:5", "guard:primarch", "end:truth"];
const h = await digestOf(keys, 7);
const memo = memoText({ app: "kenotaf", v: 1, c: 7, n: keys.length, h });
const sig = await sendMemo(c, kp.publicKey, async (tx) => { tx.sign(kp); return tx; }, memo);
console.log("sealed:", sig);
console.log("explorer: https://explorer.solana.com/tx/" + sig + "?cluster=devnet");
const back = await readMemo(c, sig);
const parsed = back ? parseMemo(back) : null;
console.log("memo on chain:", back);
console.log("digest matches recomputation:", parsed?.h === (await digestOf([...keys].reverse(), 7)));
process.exit(0);

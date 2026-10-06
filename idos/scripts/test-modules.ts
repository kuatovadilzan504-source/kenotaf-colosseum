// Module NFTs on Solana devnet with a funded key: mint → read back → mail to another wallet → ownership moves.
//   KZ_TEST_KEY=<path to a JSON secret key with a little devnet SOL> node scripts/test-modules.ts
import fs from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { attributesOf, makeUmi, mintModule, ownerOf, sendModule } from "../src/modules/kenotaf/modulenft.ts";

const RPC = "https://api.devnet.solana.com";
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.KZ_TEST_KEY!, "utf8"))));
const bal = async () => (await new Connection(RPC).getBalance(kp.publicKey)) / LAMPORTS_PER_SOL;
const b0 = await bal();
console.log("wallet", kp.publicKey.toBase58(), "balance", b0);

const base = makeUmi(RPC, createSignerFromKeypair(makeUmi(RPC, undefined as never), fromWeb3JsKeypair(kp)));
void signerIdentity;
let failed = 0;
const check = (l: string, ok: boolean, x = "") => { console.log((ok ? "ok   " : "FAIL ") + l + (x ? "  " + x : "")); if (!ok) failed++; };

const m = await mintModule(base, "felt_soles", "ВОЙЛОЧНЫЕ ПОДОШВЫ", 7);
check("module minted", !!m.asset, `asset ${m.asset} tx ${m.signature.slice(0, 12)}…`);
console.log("explorer: https://explorer.solana.com/address/" + m.asset + "?cluster=devnet");
check("owner is the courier's wallet", (await ownerOf(base, m.asset)) === kp.publicKey.toBase58());
const attrs = await attributesOf(base, m.asset);
check("attributes on chain", attrs.module === "felt_soles" && attrs.courier === "7" && attrs.game === "kenotaf", JSON.stringify(attrs));

const friend = Keypair.generate().publicKey.toBase58();
await sendModule(base, m.asset, friend);
check("mailed: the owner is now the other courier", (await ownerOf(base, m.asset)) === friend);
check("an unknown asset has no owner", (await ownerOf(base, Keypair.generate().publicKey.toBase58())) === null);
console.log(`cost: ${(b0 - (await bal())).toFixed(5)} SOL`);
console.log(failed ? `${failed} FAILED` : "ALL OK");
process.exit(failed ? 1 : 0);

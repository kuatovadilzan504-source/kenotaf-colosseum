// Node check of the Solana wallet-login flow against the real backend (no browser, no extension):
// a throwaway keypair signs the server challenge exactly like Phantom's signMessage would.
import crypto from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { createIDosGamesClient } from "@idosgames/core";
import { loginWithWalletSolana } from "@idosgames/wallet";

const TITLE = process.env.TITLE || "16KMA60R";
const kp = Keypair.generate();
const seed = Buffer.from(kp.secretKey.slice(0, 32));
const pkcs8 = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
const key = crypto.createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
const signMessage = async (m) => new Uint8Array(crypto.sign(null, Buffer.from(m), key));

const client = createIDosGamesClient({ titleID: TITLE, throttleMs: 0 });
const r = await loginWithWalletSolana({ client, networkID: "solana-devnet", walletAddress: kp.publicKey.toBase58(), signMessage });
console.log("wallet", kp.publicKey.toBase58());
console.log("login ok:", r.ok, r.ok ? "" : JSON.stringify(r).slice(0, 400));
if (r.ok) console.log("userId:", client.auth.context?.UserID);
process.exit(0);

import { Connection, PublicKey, LAMPORTS_PER_SOL, type Transaction } from "@solana/web3.js";
import { isEmbeddedInPlatform } from "@idosgames/wallet";
import { DEVNET_RPC } from "./ids";
import { digestOf, memoText, sendMemo } from "./chainlib";

// The courier's own wallet extension (Phantom, Solflare, Backpack) — used to sign the seal.
// Inside idosgames.com's frame nothing may be signed by the game (the site's wallet does the sign-in
// only), so there the seal is offered on the game's own address instead.

export interface Injected {
  publicKey?: { toBase58(): string } | null;
  connect(): Promise<unknown>;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signMessage?(message: Uint8Array, display?: string): Promise<{ signature: Uint8Array } | Uint8Array>;
}

export const embedded = (): boolean => isEmbeddedInPlatform();

export function findProvider(): Injected | null {
  const w = window as unknown as Record<string, unknown> & { phantom?: { solana?: Injected }; backpack?: Injected; solflare?: Injected; solana?: Injected };
  return w.phantom?.solana ?? w.solflare ?? w.backpack ?? w.solana ?? null;
}

export async function connectWallet(): Promise<{ provider: Injected; address: string }> {
  const provider = findProvider();
  if (!provider) throw new Error("NO_WALLET");
  await provider.connect();
  const address = provider.publicKey?.toBase58();
  if (!address) throw new Error("NO_WALLET");
  return { provider, address };
}

/** signMessage in the shape @idosgames/wallet's login expects: raw bytes in, 64-byte signature out. */
export const messageSigner = (provider: Injected) => async (m: Uint8Array): Promise<Uint8Array> => {
  if (!provider.signMessage) throw new Error("This wallet cannot sign messages.");
  const r = await provider.signMessage(m, "utf8");
  return r instanceof Uint8Array ? r : r.signature;
};

export const connection = (): Connection => new Connection(DEVNET_RPC, "confirmed");

export async function balanceSol(address: string): Promise<number> {
  return (await connection().getBalance(new PublicKey(address))) / LAMPORTS_PER_SOL;
}

/** Devnet faucet; it is rate-limited, so a failure is reported to the courier as such. */
export async function airdrop(address: string): Promise<void> {
  const c = connection();
  const sig = await c.requestAirdrop(new PublicKey(address), LAMPORTS_PER_SOL);
  const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash();
  await c.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
}

/** Seals the ledger keys in one devnet transaction; returns its signature. */
export async function seal(keys: string[], no: number, expectWallet: string | null): Promise<string> {
  const { provider, address } = await connectWallet();
  if (expectWallet && expectWallet !== address) throw new Error(`WRONG_WALLET:${expectWallet}`);
  const h = await digestOf(keys, no);
  const memo = memoText({ app: "kenotaf", v: 1, c: no, n: keys.length, h });
  return sendMemo(connection(), new PublicKey(address), (tx) => provider.signTransaction(tx), memo);
}

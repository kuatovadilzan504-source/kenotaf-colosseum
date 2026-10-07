// Solana side of the Book of the Council. No imports from the project and no browser globals beyond
// WebCrypto, so scripts/test-seal.ts runs the very same code in Node against devnet (the same code runs on mainnet).
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export type SignTx = (tx: Transaction) => Promise<Transaction>;

/** SHA-256 of the courier's ledger keys (sorted) and number — anyone can recompute it from the public Book. */
export async function digestOf(keys: string[], no: number): Promise<string> {
  const text = `kenotaf/v1/${no}\n${[...keys].sort().join("\n")}`;
  const h = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SealMemo {
  app: "kenotaf";
  v: 1;
  /** courier number */
  c: number;
  /** entries sealed */
  n: number;
  /** digest of their keys */
  h: string;
}

export const memoText = (m: SealMemo): string => JSON.stringify(m);

export function parseMemo(text: string): SealMemo | null {
  try {
    const m = JSON.parse(text) as SealMemo;
    return m && m.app === "kenotaf" && typeof m.h === "string" ? m : null;
  } catch {
    return null;
  }
}

/** The whole seal: one Memo instruction signed by the courier's wallet — a record nobody can edit. */
export async function sendMemo(connection: Connection, payer: PublicKey, sign: SignTx, memo: string): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight }).add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM,
      keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
      data: Buffer.from(memo, "utf8"),
    }),
  );
  const signed = await sign(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  // polled, not subscribed: public RPCs do not all serve the websocket that confirmTransaction opens
  for (;;) {
    const st = (await connection.getSignatureStatuses([sig])).value[0];
    if (st?.err) throw new Error(`transaction failed: ${JSON.stringify(st.err)}`);
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return sig;
    if ((await connection.getBlockHeight("confirmed")) > lastValidBlockHeight) throw new Error("transaction expired before it was confirmed");
    await new Promise((r) => setTimeout(r, 1200));
  }
}

/** Reads a seal back from the chain: the memo text of a confirmed transaction. */
export async function readMemo(connection: Connection, signature: string): Promise<string | null> {
  const tx = await connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx) return null;
  for (const ix of tx.transaction.message.instructions) {
    if ("parsed" in ix && ix.programId.equals(MEMO_PROGRAM)) return String(ix.parsed);
  }
  return null;
}

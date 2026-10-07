// Backpack modules as Metaplex Core assets. A module found in the game can be written into the courier's
// wallet; from then on the game honours it only while the wallet holds it, and it can be mailed to another
// courier (an ordinary Core transfer). No imports from the project and no browser globals, so
// scripts/test-modules.ts runs this very code in Node (on devnet, where it costs nothing).
import { create, fetchAsset, mplCore, transfer } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey, type Signer, type Umi } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";

/** Where each module's metadata JSON and plate image live (scripts/gen-nft.mjs writes them into the build). */
export const NFT_BASE = "https://16kma60r.idos.games/nft/";

export const makeUmi = (rpc: string, identity: Signer): Umi => {
  const umi = createUmi(rpc).use(mplCore());
  umi.identity = identity;
  umi.payer = identity;
  return umi;
};

/** A client that only reads the chain (no signer needed). */
export const readUmi = (rpc: string): Umi => createUmi(rpc).use(mplCore());

/** Writes a module into the wallet: one Core asset whose attributes name the module and its courier. */
export async function mintModule(umi: Umi, moduleId: string, name: string, courierNo: number): Promise<{ asset: string; signature: string }> {
  const asset = generateSigner(umi);
  const res = await create(umi, {
    asset,
    name,
    uri: `${NFT_BASE}${moduleId}.json`,
    plugins: [{ type: "Attributes", attributeList: [{ key: "module", value: moduleId }, { key: "courier", value: String(courierNo) }, { key: "game", value: "kenotaf" }] }],
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });
  return { asset: asset.publicKey.toString(), signature: base58.deserialize(res.signature)[0] };
}

/** Who holds this asset right now (null: no such asset or it was burned). The game's only source of truth. */
export async function ownerOf(umi: Umi, asset: string): Promise<string | null> {
  try {
    return (await fetchAsset(umi, publicKey(asset))).owner.toString();
  } catch {
    return null;
  }
}

/** Mails the module: a plain transfer to another courier's wallet, signed by the sender. */
export async function sendModule(umi: Umi, asset: string, toWallet: string): Promise<string> {
  const a = await fetchAsset(umi, publicKey(asset));
  const res = await transfer(umi, { asset: a, newOwner: publicKey(toWallet) }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });
  return base58.deserialize(res.signature)[0];
}

/** The attributes written at mint time, read back from the chain (proof for reviewers: module, courier, game). */
export async function attributesOf(umi: Umi, asset: string): Promise<Record<string, string>> {
  const a = await fetchAsset(umi, publicKey(asset));
  const out: Record<string, string> = {};
  for (const x of a.attributes?.attributeList ?? []) out[x.key] = x.value;
  return out;
}

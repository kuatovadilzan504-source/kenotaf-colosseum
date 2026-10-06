# Submission text

Copy-paste material for the hackathon form. Facts only; every claim here is checked against the repository.

## Name

КЕНОТАФ (Cenotaph)

## One line

A diesel-punk metroidvania in which Solana is the Council's ledger: your wallet is your account, every deed goes into a
Book that you can seal on-chain, and couriers leave letters for each other.

## Short description (≈100 words)

КЕНОТАФ is a finished single-player metroidvania — 86 rooms, ten guardians, thirty recorded cylinders, two endings — about a
courier forbidden to read the letters he carries. For this hackathon it became an online world on the iDos Games platform.
You sign in with a Solana wallet; the platform issues you a courier number and keeps your **Book of the Council**: cylinders
read, guardians beaten, test-stand records, the ending you chose. Couriers leave short letters at the pneumatic-mail stations
for a "stamp" (a platform currency), and reading a stranger's letter pays one back. The Book can be sealed on Solana devnet.

## Solana integration

- **Wallet authentication (devnet).** Phantom / Solflare / Backpack sign the platform's challenge with `signMessage` — no
  transaction, no fee. The address *is* the account; inside idosgames.com the site's wallet signs.
- **A wallet-bound ledger.** Entries of the Book belong to that account; leaderboards, stamps, letters and the cloud save follow it.
- **An on-chain seal.** One **Memo** transaction signed by the player's wallet carries `{app, v, courier no, entry count,
  SHA-256 digest of the entry keys}`. `idos/scripts/verify-seal.mjs <courierNo> <signature>` recomputes the digest from the public
  ledger and compares it with the chain.
- **Shared-world numbers** (how all couriers ended the game, who beat each guardian) are computed by platform counters over the same entries.
- Not implemented: NFTs, token payouts. The seal transaction has not been signed with a real wallet extension by the author
  (devnet faucet was dry); sign-in and everything else were verified against the real backend with throwaway keys.

## Built with iDos Games

Title `XV979CYC`, live at https://xv979cyc.idos.games/ and https://idosgames.com/app/XV979CYC/. The server side is configuration of
the platform: a `Stamps` currency, three data collections (`ledger`, `letters`, `reads`) with access rules, word filter, per-letter cost
and per-read reward, seven leaderboards, cloud-save keys, ban levels and the Solana devnet network. The host is the platform's
React shell with one module that embeds the game (`idos/src/modules/kenotaf`).

## Links

- Play: https://xv979cyc.idos.games/ (also https://idosgames.com/app/XV979CYC/)
- Repository: _(this repository)_
- Judges' guide: `docs/JUDGES.md` · Demo script: `docs/DEMO_SCRIPT.md`
- Demo video: _(add the link after recording)_

## Requirement check

| Requirement | Status |
|---|---|
| Built using iDos Games | yes — Title `XV979CYC`, deployed through the platform's build API |
| Playable and functional | yes — live links above; runs standalone too (`game/index.html`) |
| Meaningful Solana integration | wallet auth + wallet-bound ledger + on-chain Memo seal (see the limits above) |
| Submitted to the hackathon | _(to do by the team)_ |

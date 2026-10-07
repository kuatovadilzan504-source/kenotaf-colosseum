# Architecture

## Two halves, one bridge

The game (`game/`, vanilla JS) is served unchanged and mounted as a same-origin iframe by the host (`idos/`, React + iDos Games SDK).
The only file of the game that knows about the host is `game/js/core/chain.js`: it posts `{kz:1, t, …}` messages (a letter read, a guardian
beaten, a stand passed, an ending, a module found, a mail-station request) and receives the courier's session, toasts and the list of modules
the wallet holds. Opened on its own (`game/index.html`, `file://`) the game runs exactly as before — every `Chain` call is a no-op.

The host signs the player in, opens the session (courier number, cloud save), and turns the game's messages into platform writes and Solana
transactions (`idos/src/modules/kenotaf/`: `bridge.ts`, `backend.ts`, `depot.ts`, `modulenft.ts`, `chainlib.ts`, `wallet.ts`, `ui/`).

## Platform configuration (iDos Games Title `16KMA60R`)

The server side is **configuration, not code** — `idos/scripts/gen-config.mjs` generates it:

- currency `Stamps` (every courier starts with 5);
- collection `ledger` — one record per deed, idempotent per courier, counters per key (how many couriers did the same);
- collections `letters` (140 characters, costs a stamp, blocked words, owner or moderator delete) and `reads` (one per courier per letter,
  pays a stamp, a counter per letter);
- collection `couriers` — the record key `c<no>` *is* the courier number, so a number is issued once and gives the wallet for mail;
- collection `assets` — which Core asset is which module of which courier, counters per module;
- collection `parcels` — notices for the recipient of a mailed module, expiring after 30 days;
- seven leaderboards (five test stands, the Council exam, cylinders read);
- custom-data keys: Public `courier_no`, Private `save_v3` (the cloud save);
- ban levels (`council` blocks login), the `moderator` role, the Solana networks (mainnet for players, devnet for tests).

Two namespaces exist: `kz_` (players) and `dev_` (tests; owners may delete, so test scripts clean up after themselves).

## Solana

| Action | On chain | Who signs |
|---|---|---|
| Sign in | nothing — the platform's challenge is signed with `signMessage` | the player's wallet |
| Seal the Book | one Memo transaction: `{"app":"kenotaf","v":1,"c":<courier>,"n":<entries>,"h":"<sha-256 of the sorted entry keys>"}` | the player's wallet |
| Write a module to the wallet | Metaplex Core `create` with the Attributes plugin (`module`, `courier`, `game`); metadata at `/nft/<id>.json` | the player's wallet (pays the rent) |
| Mail a module | Metaplex Core `transfer` to the recipient's wallet (looked up in `couriers`) | the sender's wallet |
| Accept a parcel | nothing — the host checks `fetchAsset` owner and attributes | — |

**Who owns a module is read from Solana every time** (`fetchAsset`), not from the database: the platform stores only the index. A module that
leaves the wallet leaves the backpack; a module that arrives appears in it. The metadata and the brass plate of each module
(`idos/public/nft/<id>.json|svg`) are generated from the game's own table by `idos/scripts/gen-nft.mjs` and served with the game.

The browser talks to a public mainnet RPC (`solana-rpc.publicnode.com` — `api.mainnet-beta.solana.com` refuses browsers) and confirms
transactions by polling. `VITE_KZ_CHAIN=devnet` switches a local build to devnet for testing.

## Repository layout

```
game/                  the game (vanilla JS, 1.8 MB) — see docs/GAME.md
  js/core/chain.js     the bridge to the host (postMessage; no-ops when not embedded)
idos/                  the iDos Games host
  src/modules/kenotaf/ module.tsx (mounts the game), bridge.ts, backend.ts, depot.ts (modules, mail),
                       modulenft.ts (Core), chainlib.ts (Memo seal), wallet.ts, ui/ (Book, Depot, letter dialog)
  src/walletLogin.tsx  Solana sign-in
  public/nft/          module metadata and plates
  scripts/             gen-config, gen-nft, tests, verify-seal, zip packer
docs/                  JUDGES.md, ARCHITECTURE.md, GAME.md, design documents, screenshots
tools/                 the game's automated checks and screenshot labs
screenshots/           art
```

## Timeline

The single-player game was built before the hackathon (1–5 October 2026, imported here as the first commit). Everything for the hackathon is in
`idos/`, `game/js/core/chain.js`, a handful of one-line hooks in `game/js/` (`systems.js`, `world.js`, `trials.js`, `exam.js`, `game.js`,
`post.js`, `state.js`, `ui/pack.js`) and `docs/`.

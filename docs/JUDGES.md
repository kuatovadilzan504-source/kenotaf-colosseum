# Judges' guide

Everything you need to review КЕНОТАФ in **5 minutes**, plus how to check the Solana part yourself.

| | |
|---|---|
| **Play** | https://xv979cyc.idos.games/ — also on the platform page https://idosgames.com/app/XV979CYC/ |
| Network | Solana **devnet** |
| Needs | a desktop browser (Chrome / Edge); a Solana wallet only for the optional on-chain seal |
| First load | about 10 seconds (the game is 2 MB of scripts and builds its art procedurally) |

The game is in Russian. Every action you need is listed below with the exact on-screen words.

## The idea in two sentences

You are a courier whom the Council forbade to read the letters he carries. The Council keeps a ledger of everything a courier
does — in the game that ledger is the **Book of the Council**, tied to your wallet, and couriers also leave **letters** for each
other at the pneumatic-mail stations. The Book can be **sealed on Solana** with one Memo transaction, and the twelve **backpack modules** are
Metaplex Core assets: the game keeps a module in your backpack only while your wallet holds it, and the mail can carry it to another courier.

## Path A — about 10 minutes, no wallet

The online parts sit on top of the real game, so the quickest way to see them is to play the first minutes.

1. Open https://xv979cyc.idos.games/ and press **«Играть гостем (без кошелька)»**.
2. The game menu shows your identity line: **«КУРЬЕР №N  ГОСТЬ  МАРОК 5»**. The number comes from the platform's counter; 5 stamps
   (марок) is the starting balance. The menu also has a **«КНИГА УЧЁТА»** button.

   ![menu](img/menu.jpg)

3. Press **«НАЧАТЬ»** (E / Space skips the intro cards). Controls: **A / D** walk, **Space** jump (hold = higher), **E** interact,
   **Esc** pause (the map shows unvisited rooms with «?»), **J** strike, **Shift** dash.
4. **Reading a cylinder → the Book.** The first rooms are a corridor towards the **Насосная станция** (pump station, the fourth room).
   Brass cylinders lying about are the recorded letters; stand next to one and press **E**. A few seconds later the game says
   *«ЗАПИСЬ №N ВНЕСЕНА В КНИГУ УЧЁТА. ЧИТАЛИ: n»* (n = how many couriers have read it). The cellar under the pump station holds cylinder №1.
5. **Esc → «КНИГА УЧЁТА».** The tab **«Моя книга»** lists the oath and every deed you did.

   ![book](img/book.jpg)

   Other tabs: **«Рекорды»** (seven leaderboards), **«Совет»** (what all couriers have done: how many took the oath, which ending they chose,
   how many beat each guardian — numbers appear one by one), **«Письма»**.
6. **Letters between couriers.** At the bottom of the pump station, next to a map plate, there is a pneumatic-mail **hatch**. Press **E**
   (it opens the hatch), then **E** again (the station menu opens). Choose **«ОСТАВИТЬ ПИСЬМО КУРЬЕРАМ»**.

   ![station](img/station.jpg)

   The dialog warns: **«Модерация может вас забанить и удалить все ваши письма»**. Write something (3–140 characters) and send.
   Your stamps go from 5 to 4 — a letter costs one stamp. Links and swear words are refused by the server.

   ![letter](img/letter.jpg)

7. **Reading somebody else's letter pays.** Open the game in a second browser profile (or a private window), play as another guest, go to the
   same hatch and choose **«ПИСЬМА КУРЬЕРОВ»**: the Postmaster reads your letter aloud to that courier and he receives one stamp. Back in the
   first window, **Книга → Письма** shows how many couriers read each of your letters.
   (Letters from other couriers may already be waiting there.)


## Path B — the Solana part (≈5 more minutes)

You need a browser wallet (Phantom, Solflare or Backpack) switched to **Devnet** (Phantom: Settings → Developer Settings →
Testnet Mode → Solana Devnet) and a few devnet SOL from https://faucet.solana.com (0.01 SOL is plenty).

1. Open **https://xv979cyc.idos.games/** (the game's own address — wallets may sign transactions here; inside the
   idosgames.com frame the page lends the game its wallet for **sign-in only**).
2. Press **«Принять присягу кошельком Solana»**. The wallet asks for a **message signature** (no transaction, no fee). That
   signature is the whole login: your **address is your account**. The menu now shows `КУРЬЕР №N  4Fy…9aQ`.
3. Do something that goes into the Book (path A, step 4: read a cylinder).
4. **Esc → «КНИГА УЧЁТА» → «Запечатать в Solana».** The wallet asks to sign **one transaction**. The Book tab then shows a ◆
   next to each sealed entry; the link opens the transaction in Solana Explorer (devnet): a **Memo** instruction with JSON like
   `{"app":"kenotaf","v":1,"c":7,"n":12,"h":"<sha-256>"}` — courier number, entry count and the digest of all entry keys.
5. **Verify without trusting us:**
   ```bash
   cd idos && npm install
   node scripts/verify-seal.mjs <courierNo> <transactionSignature>
   ```
   It signs in as a throwaway guest, reads the courier's entries from the platform's ledger (readable by any signed-in account),
   recomputes the digest exactly as the game does and compares it with the Memo from devnet.
   (`NS=dev_` checks the test namespace.)

## Path C — modules as assets, mailed between couriers (≈5 more minutes, needs ~0.01 devnet SOL)

1. Play until you pick up a backpack module. A wallet login is needed.
2. Go to a pneumatic-mail hatch (**E**, **E**) and choose **«ПОСЫЛКИ И СКЛАД»** — or open **Esc → КНИГА УЧЁТА → «Склад»**.
3. The found module shows **«Записать в кошелёк»**: the wallet signs one Metaplex Core `create` (~0.003 SOL). The row becomes **◆ … в кошельке** with a
   link to the asset on Solana Explorer; its attributes name the module, your courier number and the game. The backpack shows **◆** next to it.
4. **«Отправить курьеру»** takes another courier's number: the asset is transferred to that courier's wallet (looked up in the courier registry), a
   parcel notice is left for them, and **the module disappears from your backpack** (the game follows the wallet).
5. The other courier opens the Depot, sees **«Тебе прислали»**, presses **«Принять»** — the game checks on chain that their wallet holds the asset and
   that it is a КЕНОТАФ module — and the module is in their backpack, usable in the game.
   Mint and mail also appear in the Book and are covered by the seal.

```bash
cd idos && KZ_TEST_KEY=<json secret key with ~0.01 devnet SOL> node scripts/test-modules.ts   # the same cycle without a browser
```

## What to look at, by criterion

| Criterion | Where to look |
|---|---|
| **Creativity & originality** | Solana is the game's *setting*: the Council's ledger is the Book; reading other people's letters is the game's one sin and here it pays a stamp; the ending screen tallies how all couriers ended the game. |
| **Gameplay & UX** | A complete 86-room metroidvania underneath (see the main README). Online parts never interrupt play: they are toasts in the game's own voice, the station menu and the pause menu. The game also runs without any of it (open `game/index.html`). |
| **Solana integration** | Wallet sign-in on devnet (signature-only), account = address; the Book is bound to the wallet; letters/stamps/records/cloud-save belong to that account; the optional on-chain **seal** (Memo with a recomputable digest); the backpack modules as **Metaplex Core assets** — mint, hold (the game honours them only while the wallet holds them) and transfer between couriers through the pneumatic mail. |
| **Execution** | The platform side is pure configuration generated by a script (`idos/scripts/gen-config.mjs`); tests that exercise it with throwaway wallets (`idos/scripts/test-backend.mjs`); moderation and ban levels are configured, not promised. |

## Honest limits (so nothing surprises you)

- **No real wallet extension was used by the author.** The seal and the module flows were run on devnet with a funded key, in Node and in a browser
  through a stand-in wallet object that signs with that key. If Phantom, Solflare or Backpack misbehave on the seal, the mint or the transfer,
  please tell us. Sign-in through the idosgames.com frame was not tested either (and inside that frame the game cannot sign transactions at all —
  the Book says so and links to the game's own address).
- The game is client-side JavaScript: the Core assets prove who *holds* a module, not that it was earned in play. Other couriers' ghosts at the test
  stands are **not** implemented.
- Courier numbers are keys of the registry (`couriers`): two simultaneous first logins cannot share one.

## Troubleshooting

- **A black or empty page for ~10 s** — normal first load. If it persists, try Chrome/Edge and a hard refresh.
- **«Кошелёк не найден»** — the extension is not injected on this page; reload after unlocking it.
- **The wallet shows Mainnet** — switch it to Devnet before signing; the seal goes to devnet only.
- **The Book tabs fill in slowly** — the platform answers counter reads at a pace of a couple per second.

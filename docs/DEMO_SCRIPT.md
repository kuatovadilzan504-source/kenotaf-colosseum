# Demo video script (target: 2:45, hard limit 3:00)

One take per scene, 1080p, English voice-over (the game itself is Russian — burn in short captions where marked).
Rehearse the route first (pump station → cellar cylinder → hatch) so each beat takes seconds; cut dead walking in the edit.

## Before you record (10 minutes, once)

- [ ] Phantom (or Solflare/Backpack) on **Devnet**, funded with ≥ 0.05 SOL from https://faucet.solana.com.
- [ ] Two browser windows side by side: **A** = your wallet profile on https://xv979cyc.idos.games/,
      **B** = a private window (guest) on the same link. Both logged in, both on the menu.
- [ ] Record with a **fresh wallet** (a fresh wallet is a fresh Book): the first cylinder should be read live. If you rehearsed, use another wallet for the take.
- [ ] Browser zoom 100 %, bookmarks bar hidden, notifications off, game volume ~40 %, music on.
- [ ] Open https://explorer.solana.com/?cluster=devnet in a third tab (for the last scene).
- [ ] Have `docs/img/book.jpg` ready in case a scene needs a still.

## Shot list

| # | Time | On screen | Voice-over (read at a calm pace) |
|---|------|-----------|----------------------------------|
| 1 | 0:00–0:15 | Slow pan over the game menu (the live background), title КЕНОТАФ. Cut to a 2-second montage: a boss fight, the Seal wheel, the finale sunrise (take from `screenshots/` or the finale video `dist/kenotaf-finale.webm`). | "КЕНОТАФ is a diesel-punk metroidvania: 86 rooms, ten guardians, two endings. You are a courier forbidden to read the letters you carry. Here is what we added for this hackathon — Solana as the game's setting, not a menu." |
| 2 | 0:15–0:40 | Window A, login screen. Click **«Принять присягу кошельком Solana»**; Phantom pops up showing *Sign message* (zoom on it). Approve. Menu appears with `КУРЬЕР №N  4Fy…9aQ`. Caption: **"Sign-in = a signature. Your address is your account."** | "You sign in with your wallet. It's one message signature — no transaction, no fee — and your address becomes your account. The platform issues you a courier number." |
| 3 | 0:40–1:10 | Walk to the first cylinder (cut the walking), press E; the recording plays. The in-game line *«ЗАПИСЬ №1 ВНЕСЕНА В КНИГУ УЧЁТА. ЧИТАЛИ: n»* appears. Esc → **КНИГА УЧЁТА** → list shows the entry. Caption: **"Every deed goes into the Book of the Council."** | "Reading a recorded cylinder enters a line in the Book of the Council — the Council's ledger — and the game tells me how many other couriers have read it. Guardians, test stands and endings are entered the same way and also feed seven leaderboards." |
| 4 | 1:10–1:50 | Switch to the Book's **«Запечатать в Solana»** button, click, approve the transaction in Phantom (zoom on it: one instruction, tiny fee). The ◆ appears; click it → Solana Explorer (devnet) opens on the transaction: show the **Memo** JSON. Caption: **"One Memo transaction: digest of the whole Book."** Then split-screen the terminal: `node idos/scripts/verify-seal.mjs <no> <signature>` → **MATCH**. | "Anything can be edited in a database, so the courier seals the Book on Solana. One Memo transaction, signed by my wallet, carries a SHA-256 digest of every entry. Anyone can recompute it from the public ledger and compare — here the script says it matches." |
| 5 | 1:50–2:25 | Window A: walk to the pneumatic hatch in the pump station, E, E, **«ОСТАВИТЬ ПИСЬМО КУРЬЕРАМ»**. In the dialog hold on the red warning **"Модерация может вас забанить и удалить все ваши письма"** for 2 s. Type a short real-sounding letter, send. Stamps 5 → 4. Cut to window B: same station, **«ПИСЬМА КУРЬЕРОВ»** → the Postmaster reads A's letter, "+1 МАРКА". Back to A: Book → **Письма** shows "прочли: 1". | "The pneumatic mail is the heart of it: couriers leave letters for each other at the stations. A letter costs a stamp — a platform currency. Reading a stranger's letter, the game's one forbidden act, pays one back. Letters are public, filtered by the server, and moderators can delete them and ban authors — the dialog says so up front." |
| 6 | 2:25–2:45 | Book → **«Совет»**: the ending split, guardians beaten; then **«Рекорды»**. Caption: **"Shared world: what all couriers did."** End card: КЕНОТАФ, the repo link, the live link, "Solana devnet · iDos Games". | "Everything the couriers do adds up to a shared world: how the game ended for everyone, who beat which guardian, who holds the records. КЕНОТАФ — built on iDos Games, with Solana as the Council's ledger." |

Total ≈ 2:45. If you need to cut, drop the leaderboard glance in scene 6 first, then the explorer split-screen in scene 4.

## If something goes wrong on camera

- **Wallet not detected** — reload the page after unlocking the wallet; the login screen shows a hint with a Phantom link.
- **Seal fails with "insufficient funds"** — fund the wallet (faucet) and retry; the Book tab has a *Получить SOL* button that tries the public airdrop.
- **Seal shows "Открыт другой кошелёк"** — the account was created by another wallet; switch to it in the extension.
- **The Council tab fills slowly** — wait ~10 s; numbers appear one by one (the platform serves a couple of counter reads per second).
- **Take the letter scene in two real windows** — a fake second window is easy to spot, and the point is that two accounts see each other.

## Voice and tone

Calm, a little dry — the game is. Use the in-game words once and translate them (stamp = марка, Book of the Council = Книга учёта Совета).
Avoid the words "NFT" and "mint": nothing in the project is an NFT, and the video must not suggest it is.

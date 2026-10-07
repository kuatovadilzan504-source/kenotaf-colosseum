# КЕНОТАФ

**A diesel-punk metroidvania where Solana is the Council's ledger.**
You are a courier in an underground arcology whose Council forbids couriers to read the letters they carry. You read them anyway —
and now your wallet is your account, every deed goes into a Book you can seal on-chain, couriers leave letters for each other —
and the modules of your backpack are **Metaplex Core assets** that the game honours only while your wallet holds them, and that the pneumatic mail can carry to another courier.

Reviewing? Start with [docs/JUDGES.md](docs/JUDGES.md).

![menu](docs/img/menu.jpg)

## What it is

КЕНОТАФ is a complete single-player game: five zones, 86 rooms, eight abilities, five guardians and five mini-bosses, thirty recorded
cylinders, fifteen stashes, two endings and a post-game Council exam. Combat is about *breaking* a mechanism's parts, not killing it.
The game is plain JavaScript with no build step — open `game/index.html` and it runs.

## What the hackathon added: Solana is the setting, not a menu

The Council of the arcology keeps a ledger of everything a courier does. In the game that ledger is the **Book of the Council**, and it is
bound to your wallet.

| In the game | On the platform / on Solana |
|---|---|
| Start | **Wallet sign-in** (Phantom, Solflare, Backpack, or the idosgames.com wallet): you sign the server's challenge; your address *is* your account and you become **Courier №N**. Guests can play too. |
| Read a recorded cylinder | A `read:N` entry goes into your Book; the game tells you how many couriers have read it. |
| Beat a guardian, pass a test stand, take the exam | Book entries; stands and the exam also post times to **leaderboards** (seven in all). |
| Choose an ending | "Door" or "Truth" is recorded; the *Council* tab shows how all couriers ended the game. |
| Leave a letter at a pneumatic station | Other couriers find it there. Posting costs one **stamp** (a platform currency); every foreign letter you read pays one back. Moderators can delete letters and **ban** couriers — the dialog says so. |
| Press *«Запечатать в Solana»* | One **Memo transaction on Solana mainnet** (a fraction of a cent), signed by your wallet, with the SHA-256 digest of your Book keys. [`verify-seal.mjs`](idos/scripts/verify-seal.mjs) recomputes it from the public ledger. |
| Find a backpack module | One of twelve. The **Depot** tab can write it into your wallet as a **Metaplex Core asset** on mainnet (attributes: module, courier, game; ≈ 0.0035 SOL of account rent). From then on the game keeps it in your backpack only while the wallet holds it. |
| Pneumatic mail → *«ПОСЫЛКИ И СКЛАД»* | Send a module to another courier by number: a plain Core **transfer** to their wallet, a parcel notice for them, and the module leaves your backpack and appears in theirs. The recipient's wallet is looked up in the courier registry. |
| Close the tab | The save lives in the cloud under your account; the newer of cloud and local wins on the next device. |

| | | |
|---|---|---|
| ![station](docs/img/station.jpg) | ![letter](docs/img/letter.jpg) | ![book](docs/img/book-modules.jpg) |
| Station menu | Letter dialog with the moderation warning | The Book: a module written to the wallet and mailed to courier №5, all sealed |

## How it works

```
 ┌────────── browser ──────────────────────────────────────────────┐
 │  host page (React, iDos Games SDK)          game (iframe, vanilla JS)
 │  ├ wallet sign-in                           ├ js/core/chain.js   ← the ONLY code that knows the host
 │  ├ module "kenotaf"  ◄── postMessage ─────► │ hooks: lore, guardian, stand, exam, ending, mail station
 │  │   bridge → Book, leaderboards, letters,  └ works alone (file://): every Chain call is a no-op
 │  │   modules (the game follows the wallet)
 │  └ Book / Depot / letter dialogs, seal (Memo tx), mint & transfer (Core)
 └──────────────┬──────────────────────────────────┬───────────────┘
                │ platform API                     │ Solana mainnet RPC
        iDos Games Title 16KMA60R          Memo + Metaplex Core (wallet-signed)
        data collections · leaderboards
        currency · custom data · bans
```

The platform side is **configuration, not code** — `idos/scripts/gen-config.mjs` generates it:

- currency `Stamps` (start with 5);
- collections `ledger` (one record per deed, counters per key), `letters` (140 chars, costs a stamp, word filter, owner/moderator delete)
  and `reads` (one per courier per letter, pays a stamp, counter per letter);
- collections `couriers` (the key `c<no>` is the courier number, so a number is issued once and gives the wallet for mail), `assets` (which Core
  asset is which module of which courier, counters per module) and `parcels` (notices for the recipient, expire in 30 days);
- seven leaderboards (five test stands, the Council exam, cylinders read);
- Private custom-data key for the cloud save, Public key for the courier number;
- ban levels (`council` blocks login), the `moderator` role, the Solana network (mainnet; devnet kept for tests).

Two namespaces exist: `kz_` (players) and `dev_` (tests; owners may delete, so test scripts clean up after themselves). The platform plan allows ten
collections, so `dev_` holds only the four the module tests need (letters and reads were tested earlier and are unchanged).

**Who owns a module is read from Solana every time** (`fetchAsset`), not from the database: the platform stores only the index. The module's
metadata and plate (`public/nft/<id>.json|svg`, generated from the game's own table by `scripts/gen-nft.mjs`) are served with the game.

## Run it

```bash
# the game alone — no build, no server
open game/index.html

# the whole thing (host + game) against the test namespace
cd idos
npm install
printf 'VITE_KZ_NS=dev_\nVITE_KZ_CHAIN=devnet\n' > .env.local   # test collections + free devnet SOL; a production build sets neither
npm run dev                       # http://localhost:5180
npm run typecheck
```

Tests (real backend, throwaway wallets, they clean up after themselves):

```bash
cd idos
node scripts/test-wallet-login.mjs     # Solana sign-in, no browser
node scripts/test-backend.mjs          # Book, letters, stamps, blocked words, leaderboards, cloud save  → ALL OK
node scripts/test-seal.ts              # Memo seal on devnet (free SOL); KZ_TEST_KEY=<json key>
node scripts/test-modules.ts           # Core mint → read attributes → transfer → ownership moved; KZ_TEST_KEY=<json key>, ~0.004 SOL
node scripts/verify-seal.mjs 1         # recompute courier №1's digest (NS=dev_ for the test namespace)
```



## Repository layout

```
game/                  the game (vanilla JS, 1.8 MB) — see "КЕНОТАФ (игра)" below
  js/core/chain.js     the bridge to the host (postMessage; no-ops when not embedded)
idos/                  the iDos Games host
  src/modules/kenotaf/ module.tsx (mounts the game), bridge.ts, backend.ts, depot.ts (modules, mail), modulenft.ts (Core), chainlib.ts (Memo seal), wallet.ts, ui/
  src/walletLogin.tsx  Solana sign-in
  scripts/             gen-config, smoke tests, verify-seal, zip packer
docs/                  JUDGES.md, game design docs, screenshots
tools/                 the game's automated checks and screenshot labs
screenshots/           art
```

## Timeline and what is new

The single-player game was built before the hackathon: its history is the commits of 1–5 October 2026 in the original development
repository, imported here as the first commit. Everything for the hackathon is in `idos/`, `game/js/core/chain.js`, a handful of one-line
hooks in `game/js/` (`systems.js`, `world.js`, `trials.js`, `exam.js`, `game.js`, `post.js`, `state.js`) and `docs/`.

## Status, honestly

Verified against the real backend (Title 16KMA60R): wallet sign-in (throwaway keys), Book entries and counters, letters (cost, reward, blocked words),
leaderboards, cloud save, courier registry, asset index and parcels between two accounts, and the in-game hooks driven in a browser; the game's
own `verify` checklist passes. On **devnet**, with a funded key: the Memo seal (digest recomputed and matching) and the module cycle — mint, attributes
read back, transfer, ownership moves. In a browser the same flows ran with a **stand-in wallet object** that signs with that key: sign-in, seal, write a
module to the wallet, mail it to another courier, accept it there and watch it appear in the game (and disappear from the sender's).

**Not verified:** a real wallet extension (Phantom/Solflare/Backpack) signing these transactions, and sign-in through the idosgames.com frame.
**Known limits:** the game is client-side JavaScript, so a determined player can write any module into a wallet without finding it — the Core assets
prove *ownership and transfer*, not that the module was earned; courier numbers are issued by the registry key, but a courier created before the
registry (none exist yet on `kz_`) would not be in it. **Not built:** other couriers' ghosts at the test stands.

---

# КЕНОТАФ (игра)


Дизельпанк-метроидвания на чистом JavaScript и Canvas 2D. Курьер поднимается из Отстойника
подземной аркологии к Печати, которую двести лет никто не открывал, — и делает то, чего ему
делать не велели: читает чужие письма.

Пять зон, 86 комнат, восемь способностей, пять боссов и Экзамен Совета после финала, пять мини-боссов
с аренами, 26 видов механизмов, испытательный стенд в каждой зоне, модули ранца, тридцать цилиндров
с записями, пятнадцать заначек, две концовки.

## Запуск

Открыть `game/index.html` в браузере. Сервер и сборка не нужны, работает и по двойному клику (`file://`).

## Управление

| Клавиши | Действие |
|---|---|
| A / D | движение |
| SPACE | прыжок, удержание — выше; в воздухе — второй прыжок (выхлоп); у рифлёной стены — кошки; под латунью — магнит; посреди рывка — прыжок с разгоном рывка |
| S | присед, на бегу — подкат; в прыжке с ударом — удар вниз с отскоком |
| W | взгляд вверх; с ударом — удар вверх |
| ЛКМ · J | удар ключом — ломает узлы механизмов; удержание после взмаха — тяжёлый удар; на перегреве — РАЗРЫВ (узел ломается сразу) |
| ПКМ · K | импульс резака: без урона — толкает, отражает снаряды, в миг замаха срывает атаку; с пробойником выбивает свинец |
| SHIFT | рывок: неуязвим, сквозь механизмы, метит треснувшую деталь; в последний миг перед ударом — идеальное уклонение |
| R | гарпун к латунному рыму: тянет и бросает сквозь кольцо с сохранением скорости; с движением назад — бросок назад |
| Q (держать) | залатать куртку за РЕМОНТ (копится ударами) |
| E | двери, рычаги, сальваж, цилиндры, заначки; у фонаря — отдых и сохранение; у разобранного механизма — прислушаться; у столба стенда — старт |
| ESC | пауза: планшет-карта (TAB — весь мир), записи, ранец (модули), настройки, «Выбраться к входу» (если застряли) |
| M | звук вкл / выкл |
| Геймпад | A прыжок · X удар · B импульс · Y действие · RB рывок · RT гарпун · LB/LT (держать) залатать · START пауза |

На каждое действие — одна клавиша; только удар и импульс продублированы на мышь.

Меню и пауза работают без мыши: ↑/↓ и ENTER, ←/→ меняют значение, на геймпаде крестовина и A, назад — B.

## Настройки

Графика (КИНО · WebGL или ПРОСТАЯ · Canvas — для слабых видеокарт, после перезапуска), громкость (общая, музыка, звуки), тряска экрана (выкл / слабая / обычная — по умолчанию слабая,
1–3 пикселя), сложность (легко / нормально / сложно — крепость механизмов, длина замаха, касание,
урон по курьеру), субтитры записей, разрешение (до 1080 строк) и полный экран. Хранятся отдельно
от сохранения игры.

## Структура

```
game/                    вся игра
  index.html             разметка, порядок скриптов
  css/style.css
  js/core/               утилиты, конфиг, настройки, ввод, звук, музыка (секвенсор с лейтмотивом), физика, сохранение
  js/render/             текстуры, процедурный арт (Kit, Art, подзоны SUBART, поверхность — surface.js), реквизит,
                         следы жизни (dress.js), ориентиры зон, частицы, камера, рендер
  js/world/              комнаты по зонам (rooms/z1…z5, z*x.js — расширения, trials.js — стенды), фонари, записи, системы,
                         пневмопочта, финал и титры, сцена боссов, стенды и призраки, заначки и Курьер 38, хабы, фонограммы, Экзамен Совета
  js/combat/             бой «ломать, а не убивать»: узлы, механизм, обломки, отдача, детали-примитивы
  js/entities/           игрок, бой, снаряды и зоны боссов (bossfx.js), мехи врагов и боссов (mechs/)
  js/ui/                 HUD, реплики и голоса (voice.js), карта-планшет, меню и настройки, ранец, портреты, сцены, обучение
docs/                    дизайн-документ (DESIGN.md), GDD, анализ
screenshots/             снимки
```

Скрипты подключены классическими `<script>`, без ES-модулей: иначе игра не запустится по `file://`.

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import { Button, Popup, Tabs, errorText, v } from "@idosgames/react/ui";
import * as be from "../backend";
import { BOARDS, COL, ENDING_NAMES, GUARD_NAMES, LORE_TOTAL, OWN_ADDRESS, STANDS, STATION_NAMES } from "../ids";
import { airdrop, balanceSol, embedded, seal } from "../wallet";
import { focusGame, setKz, useKz } from "../store";

// The Book of the Council: what the courier has done (entered by the platform, sealed on Solana by the
// courier's own wallet), the records, what the other couriers did, and the courier's letters.

type Tab = "book" | "records" | "council" | "letters";

const fmtMs = (ms: number): string => {
  const m = Math.floor(ms / 60000);
  const s = (ms - m * 60000) / 1000;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(2)}`;
};
const when = (iso: string): string => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
const explorer = (sig: string): string => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

const box: CSSProperties = { border: `1px solid ${v.panelEdge}`, borderRadius: 8, padding: "10px 12px", background: "rgba(0,0,0,.25)" };
const dim: CSSProperties = { color: v.textDim, fontSize: 13 };

export function BookPanel(): ReactNode {
  const { book, me } = useKz();
  const [tab, setTab] = useState<Tab>("book");
  if (!book || !me) return null;
  const close = (): void => {
    setKz({ book: false });
    focusGame();
  };
  return (
    <Popup title="Книга учёта Совета" width={640} onClose={close} panelStyle={{ maxHeight: "92vh" }}>
      <div style={{ display: "grid", gap: 12, fontFamily: v.font, color: v.text }}>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "book", label: "Моя книга" },
            { id: "records", label: "Рекорды" },
            { id: "council", label: "Совет" },
            { id: "letters", label: "Письма" },
          ]}
        />
        <div style={{ minHeight: 320, maxHeight: "62vh", overflowY: "auto" }}>
          {tab === "book" && <BookTab />}
          {tab === "records" && <RecordsTab />}
          {tab === "council" && <CouncilTab />}
          {tab === "letters" && <LettersTab />}
        </div>
      </div>
    </Popup>
  );
}

function label(e: be.LedgerEntry): string {
  switch (e.kind) {
    case "oath":
      return "Присяга курьера";
    case "read":
      return `Цилиндр №${e.ref} прочитан`;
    case "guard":
      return `Страж «${GUARD_NAMES[e.ref] ?? e.ref}» побеждён`;
    case "stand":
      return `${STANDS[e.ref]?.name ?? e.ref}: в норму${e.n ? `, ${fmtMs(e.n)}` : ""}`;
    case "exam":
      return `Экзамен Совета сдан${e.n ? `, ${fmtMs(e.n)}` : ""}`;
    case "end":
      return `Концовка «${ENDING_NAMES[e.ref] ?? e.ref}»`;
    default:
      return e.key;
  }
}

// ------------------------------------------------------------------ my book + the seal

function BookTab(): ReactNode {
  const client = useIDosGamesClient();
  const { me } = useKz();
  const [rows, setRows] = useState<be.LedgerEntry[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [sol, setSol] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await be.loadLedger(client));
    } catch (e) {
      setErr(errorText(e instanceof Error ? e.message : String(e)));
    }
  }, [client]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (me?.wallet && !embedded()) balanceSol(me.wallet).then(setSol, () => setSol(null));
  }, [me?.wallet, note]);
  if (!me) return null;

  const reads = rows?.filter((r) => r.kind === "read").length ?? 0;
  const sealed = rows?.filter((r) => r.sig).length ?? 0;
  const pending = rows ? rows.length - sealed : 0;
  const lastSig = rows?.find((r) => r.sig)?.sig;

  const doSeal = async (): Promise<void> => {
    if (!rows) return;
    setBusy(true);
    setNote("");
    try {
      const sig = await seal(
        rows.map((r) => r.key),
        me.no,
        me.wallet,
      );
      const todo = rows.filter((r) => !r.sig);
      for (let i = 0; i < todo.length; i += 40) {
        await client.dataCollections.batch(
          todo.slice(i, i + 40).map((r) => ({ Op: "Update" as const, Collection: COL.ledger, ItemID: r.id, Update: { Set: { sig } } })),
        );
      }
      setNote(`Книга запечатана в Solana: ${rows.length} записей.`);
      await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (m === "NO_WALLET") setNote("Не найден кошелёк. Установи Phantom, Solflare или Backpack и обнови страницу.");
      else if (m.startsWith("WRONG_WALLET")) setNote(`Открыт другой кошелёк. Нужен ${me.wallet}.`);
      else if (/User rejected|rejected the request/i.test(m)) setNote("Подпись отклонена.");
      else if (/0x1|insufficient|Attempt to debit/i.test(m)) setNote("На кошельке нет тестовых SOL: нажми «Получить SOL» или возьми их на faucet.solana.com.");
      else setNote(`Печать не удалась: ${m.slice(0, 160)}`);
    } finally {
      setBusy(false);
    }
  };

  const getSol = async (): Promise<void> => {
    if (!me.wallet) return;
    setBusy(true);
    try {
      await airdrop(me.wallet);
      setNote("Начислен 1 тестовый SOL.");
    } catch {
      setNote("Фаусет devnet сейчас отказывает. Возьми SOL на https://faucet.solana.com (сеть Devnet).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={box}>
        <div style={{ fontSize: 18, color: v.gold }}>{me.name}</div>
        <div style={dim}>
          {me.wallet ? (
            <>
              Кошелёк{" "}
              <a style={{ color: v.gold }} href={`https://explorer.solana.com/address/${me.wallet}?cluster=devnet`} target="_blank" rel="noreferrer">
                {be.shortWallet(me.wallet)}
              </a>{" "}
              (Solana devnet)
            </>
          ) : (
            "Присяга без кошелька: записи есть, запечатать их в Solana нельзя."
          )}
          {", "}марок: {me.stamps}
        </div>
        <div style={{ ...dim, marginTop: 6 }}>
          Цилиндров {reads} / {LORE_TOTAL}. Записей {rows?.length ?? "…"}, запечатано {sealed}.
        </div>
      </div>

      <div style={box}>
        <div style={{ marginBottom: 6, color: v.gold }}>Печать Книги</div>
        <div style={{ ...dim, lineHeight: 1.5 }}>
          Платформа ведёт Книгу сама. Чтобы запись нельзя было переписать, курьер запечатывает её своим кошельком: одна транзакция Memo в
          Solana devnet с хешем всех записей. Хеш можно пересчитать по открытой Книге и сравнить.
        </div>
        {!me.wallet && <div style={{ ...dim, marginTop: 8 }}>Войди кошельком (выход из аккаунта в лобби), чтобы печать стала доступна.</div>}
        {me.wallet && embedded() && (
          <div style={{ ...dim, marginTop: 8 }}>
            Окно idosgames.com не даёт игре подписывать транзакции. Открой игру на её адресе:{" "}
            <a style={{ color: v.gold }} href={OWN_ADDRESS} target="_blank" rel="noreferrer">
              {OWN_ADDRESS}
            </a>{" "}
            — там кнопка печати работает.
          </div>
        )}
        {me.wallet && !embedded() && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            <Button busy={busy} disabled={!rows || pending === 0 && sealed > 0} onClick={() => void doSeal()}>
              Запечатать в Solana
            </Button>
            {sol !== null && sol < 0.002 && (
              <Button tone="grey" busy={busy} onClick={() => void getSol()}>
                Получить SOL
              </Button>
            )}
            <span style={dim}>{sol !== null ? `на кошельке ${sol.toFixed(3)} SOL` : ""}</span>
          </div>
        )}
        {note && <div style={{ marginTop: 8, fontSize: 13, color: v.gold }}>{note}</div>}
        {lastSig && (
          <div style={{ ...dim, marginTop: 6 }}>
            Последняя печать:{" "}
            <a style={{ color: v.gold }} href={explorer(lastSig)} target="_blank" rel="noreferrer">
              {lastSig.slice(0, 10)}…
            </a>
          </div>
        )}
      </div>

      {err && <div style={{ color: "#ff8a70" }}>{err}</div>}
      <div style={{ display: "grid", gap: 4 }}>
        {(rows ?? []).slice(0, 80).map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, padding: "6px 4px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <span>{label(r)}</span>
            <span style={dim}>
              {when(r.at)}
              {r.sig ? (
                <>
                  {" "}
                  <a style={{ color: v.gold }} href={explorer(r.sig)} target="_blank" rel="noreferrer" title="Запечатано в Solana">
                    ◆
                  </a>
                </>
              ) : null}
            </span>
          </div>
        ))}
        {rows && rows.length === 0 && <div style={dim}>Книга пуста. Прочитай цилиндр, победи стража.</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ records

function RecordsTab(): ReactNode {
  const client = useIDosGamesClient();
  const { me } = useKz();
  const [sel, setSel] = useState(BOARDS[0]?.id ?? "lore");
  const [data, setData] = useState<{ rows: be.TopRow[]; total: number } | null>(null);
  const [err, setErr] = useState("");
  const b = BOARDS.find((x) => x.id === sel);
  useEffect(() => {
    setData(null);
    setErr("");
    be.loadBoard(client, sel, me?.userId ?? "").then(setData, (e) => setErr(errorText(String(e?.message ?? e))));
  }, [client, sel, me?.userId]);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {BOARDS.map((x) => (
          <Button key={x.id} size="sm" tone={x.id === sel ? "green" : "grey"} onClick={() => setSel(x.id)}>
            {x.name}
          </Button>
        ))}
      </div>
      {err && <div style={{ color: "#ff8a70" }}>{err}</div>}
      {!data && !err && <div style={dim}>Читаю ведомость…</div>}
      {data && (
        <>
          <div style={dim}>Участвуют курьеров: {data.total}</div>
          {data.rows.length === 0 && <div style={dim}>Пока ни одного результата. Будь первым.</div>}
          {data.rows.map((r) => (
            <div key={r.rank} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderRadius: 6, background: r.mine ? "rgba(232,201,106,.14)" : "transparent" }}>
              <span>
                {r.rank}. {r.name}
                {r.mine ? " (ты)" : ""}
              </span>
              <b>{b?.unit === "ms" ? fmtMs(r.score) : r.score}</b>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ the Council: what everyone did

function CouncilTab(): ReactNode {
  const client = useIDosGamesClient();
  // The platform answers a counter read at a pace of a couple per second, so the numbers appear one by one.
  const [vals, setVals] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    const keys = ["end:truth", "end:door", "oath", "exam:council", ...Object.keys(GUARD_NAMES).map((id) => `guard:${id}`)];
    keys.forEach((k) => {
      void be.counter(client, k).then((n) => live && setVals((p) => ({ ...p, [k]: n })));
    });
    return () => {
      live = false;
    };
  }, [client]);
  const n = (k: string): string => (vals[k] === undefined ? "…" : String(vals[k]));
  const truth = vals["end:truth"] ?? 0;
  const door = vals["end:door"] ?? 0;
  const ends = Math.max(1, truth + door);
  const bar = (v1: number, of: number, c: string): ReactNode => (
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, (100 * v1) / Math.max(1, of))}%`, height: "100%", background: c }} />
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={box}>
        <div style={{ color: v.gold }}>Принесли присягу: {n("oath")}</div>
        <div style={dim}>Сдали Экзамен Совета: {n("exam:council")}</div>
      </div>
      <div style={box}>
        <div style={{ color: v.gold, marginBottom: 8 }}>Чем закончили игру</div>
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            Правда: {n("end:truth")} ({Math.round((100 * truth) / ends)}%)
            {bar(truth, ends, "#6f9a4a")}
          </div>
          <div>
            Дверь: {n("end:door")} ({Math.round((100 * door) / ends)}%)
            {bar(door, ends, "#c9a227")}
          </div>
        </div>
      </div>
      <div style={box}>
        <div style={{ color: v.gold, marginBottom: 8 }}>Победили стражей</div>
        {Object.entries(GUARD_NAMES).map(([id, name]) => (
          <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span>{name}</span>
            <b>{n(`guard:${id}`)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ my letters

function LettersTab(): ReactNode {
  const client = useIDosGamesClient();
  const [list, setList] = useState<be.Letter[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    be.myLetters(client).then(setList, (e) => setErr(errorText(String(e?.message ?? e))));
  }, [client]);
  useEffect(load, [load]);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ ...box, fontSize: 13, lineHeight: 1.5 }}>
        Письма оставляют на станциях пневмопочты (меню станции в хабе зоны): письмо стоит марку, а за каждое прочитанное чужое письмо дают марку.
        <br />
        <b>Модерация может вас забанить и удалить все ваши письма.</b>
      </div>
      {err && <div style={{ color: "#ff8a70" }}>{err}</div>}
      {list && list.length === 0 && <div style={dim}>Ты ещё не писал курьерам.</div>}
      {(list ?? []).map((l) => (
        <div key={l.id} style={box}>
          <div style={{ fontSize: 15 }}>{l.text}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={dim}>
              {STATION_NAMES[l.station] ?? l.station}, {when(l.at)}; прочли: {l.reads ?? 0}
            </span>
            <Button
              size="sm"
              tone="grey"
              onClick={() => void be.deleteLetter(client, l.id).then(load, (e) => setErr(errorText(String(e?.message ?? e))))}
            >
              Забрать
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

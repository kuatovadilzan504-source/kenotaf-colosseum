import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import { Button, errorText, v } from "@idosgames/react/ui";
import { acceptParcel, foundModules, incomingParcels, mintModuleFlow, sendModuleFlow, syncDepot, type Parcel } from "../depot";
import { MODULES, OWN_ADDRESS } from "../ids";
import { useKz } from "../store";
import { embedded } from "../wallet";

// The depot: the twelve backpack modules. A module found in the game can be written into the courier's
// wallet (a Metaplex Core asset); from then on the game keeps it only while the wallet holds it, and the
// pneumatic mail can carry it to another courier — a plain transfer of the asset on Solana devnet.

const box: CSSProperties = { border: `1px solid ${v.panelEdge}`, borderRadius: 8, padding: "10px 12px", background: "rgba(0,0,0,.25)" };
const dim: CSSProperties = { color: v.textDim, fontSize: 13 };
const acct = (a: string): string => `https://explorer.solana.com/address/${a}?cluster=devnet`;

function explain(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m === "NO_WALLET") return "Не найден кошелёк. Установи Phantom, Solflare или Backpack и обнови страницу.";
  if (m.startsWith("WRONG_WALLET")) return "Открыт другой кошелёк, не тот, которым ты вошёл.";
  if (m === "NO_COURIER") return "Курьера с таким номером нет.";
  if (m === "SELF") return "Это твой собственный номер.";
  if (m === "NOT_HELD") return "Этот модуль не у тебя в кошельке: передача не дошла.";
  if (m === "NOT_A_MODULE") return "Это не модуль КЕНОТАФА.";
  if (/User rejected|rejected the request/i.test(m)) return "Подпись отклонена.";
  if (/0x1\b|insufficient|Attempt to debit|no record of a prior credit/i.test(m)) return "На кошельке нет тестовых SOL: faucet.solana.com (сеть Devnet).";
  return errorText(m).slice(0, 180);
}

export function DepotTab(): ReactNode {
  const client = useIDosGamesClient();
  const { me, depot } = useKz();
  const [found, setFound] = useState<string[]>(foundModules);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [sendFor, setSendFor] = useState<string | null>(null);
  const [toNo, setToNo] = useState("");

  const refresh = useCallback(async () => {
    if (!me?.wallet) return;
    setFound(foundModules());
    try {
      await syncDepot(client, me);
      setParcels(await incomingParcels(client, me));
    } catch (e) {
      setNote(explain(e));
    }
  }, [client, me]);
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.no, me?.wallet]);

  if (!me) return null;
  if (!me.wallet)
    return <div style={box}>Модуль можно записать в кошелёк и отправить другому курьеру. Для этого войди кошельком Solana (выход из аккаунта в лобби).</div>;
  if (embedded())
    return (
      <div style={box}>
        Окно idosgames.com не даёт игре подписывать транзакции. Открой игру на её адресе:{" "}
        <a style={{ color: v.gold }} href={OWN_ADDRESS} target="_blank" rel="noreferrer">
          {OWN_ADDRESS}
        </a>
        .
      </div>
    );

  const run = async (key: string, fn: () => Promise<string | void>, done: (r: string | void) => string): Promise<void> => {
    setBusy(key);
    setNote("");
    try {
      setNote(done(await fn()));
      setSendFor(null);
      setToNo("");
      await refresh();
    } catch (e) {
      setNote(explain(e));
    } finally {
      setBusy("");
    }
  };

  const items = depot?.items ?? [];
  const row = (id: string): ReactNode => {
    const name = MODULES[id] ?? id;
    const held = items.find((i) => i.moduleId === id && i.mine);
    const gone = !held && items.some((i) => i.moduleId === id);
    const has = found.includes(id);
    return (
      <div key={id} style={{ ...box, opacity: held || has || gone ? 1 : 0.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: held ? v.gold : v.text }}>
              {held ? "◆ " : ""}
              {name}
            </div>
            <div style={dim}>
              {held ? (
                <>
                  в кошельке:{" "}
                  <a style={{ color: v.gold }} href={acct(held.asset)} target="_blank" rel="noreferrer">
                    {held.asset.slice(0, 6)}…
                  </a>
                </>
              ) : gone ? (
                "ушёл по почте"
              ) : has ? (
                "найден в игре, в кошельке пока нет"
              ) : (
                "не найден"
              )}
            </div>
          </div>
          {held && (
            <Button size="sm" tone="grey" disabled={!!busy} onClick={() => setSendFor(sendFor === id ? null : id)}>
              Отправить курьеру
            </Button>
          )}
          {!held && has && !gone && (
            <Button
              size="sm"
              busy={busy === `mint:${id}`}
              disabled={!!busy}
              onClick={() => void run(`mint:${id}`, () => mintModuleFlow(client, me, id), (sig) => `«${name}» записан в кошелёк. Транзакция: ${String(sig).slice(0, 10)}…`)}
            >
              Записать в кошелёк
            </Button>
          )}
        </div>
        {held && sendFor === id && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={dim}>курьер №</span>
            <input
              value={toNo}
              inputMode="numeric"
              onChange={(e) => setToNo(e.target.value.replace(/\D/g, "").slice(0, 7))}
              style={{ width: 90, padding: "6px 8px", borderRadius: 6, border: `1px solid ${v.panelEdge}`, background: "rgba(0,0,0,.4)", color: v.text, font: "inherit" }}
            />
            <Button
              size="sm"
              busy={busy === `send:${id}`}
              disabled={!!busy || !toNo}
              onClick={() => void run(`send:${id}`, () => sendModuleFlow(client, me, id, held.asset, Number(toNo)), (sig) => `«${name}» отправлен курьеру №${toNo}. Транзакция: ${String(sig).slice(0, 10)}…`)}
            >
              Отправить
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ ...box, fontSize: 13, lineHeight: 1.5 }}>
        Найденный модуль ранца можно записать в кошелёк как актив Solana (Metaplex Core, devnet). С этого момента игра держит его в ранце, пока он у
        тебя в кошельке. Отправь его другому курьеру по номеру — модуль уйдёт из твоего ранца и появится в его. Подпись — в твоём кошельке, ~0.003 SOL.
      </div>
      {note && <div style={{ fontSize: 13, color: v.gold }}>{note}</div>}
      {parcels.length > 0 && (
        <div style={box}>
          <div style={{ color: v.gold, marginBottom: 6 }}>Тебе прислали</div>
          {parcels.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "4px 0" }}>
              <span>
                Курьер №{p.fromNo} прислал «{MODULES[p.moduleId] ?? p.moduleId}»
              </span>
              <Button
                size="sm"
                busy={busy === `acc:${p.id}`}
                disabled={!!busy}
                onClick={() => void run(`acc:${p.id}`, () => acceptParcel(client, me, p), () => `«${MODULES[p.moduleId]}» принят в ранец.`)}
              >
                Принять
              </Button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>{Object.keys(MODULES).map(row)}</div>
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import { Button, Popup, errorText, v } from "@idosgames/react/ui";
import { writeLetter } from "../backend";
import { LETTER_MAX, STATION_NAMES } from "../ids";
import { focusGame, setKz, useKz } from "../store";

// The only place a courier writes to other couriers. The warning is part of the deal, not fine print:
// letters are public, and the Council's moderators may ban a courier and delete all of their letters.

export function LetterDialog(): ReactNode {
  const { letter, me } = useKz();
  const client = useIDosGamesClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!letter || !me) return null;

  const close = (r: { ok: boolean; msg?: string }): void => {
    letter.done(r);
    setKz({ letter: null });
    setText("");
    setErr("");
    focusGame();
  };
  const trimmed = text.trim();
  const can = trimmed.length >= 3 && me.stamps >= 1 && !busy;

  const send = async (): Promise<void> => {
    setBusy(true);
    setErr("");
    try {
      await writeLetter(client, me, letter.station, trimmed);
      close({ ok: true });
    } catch (e) {
      setBusy(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErr(/blocked words/i.test(msg) ? "В письме запрещённые слова или ссылка. Перепишите." : errorText(msg));
    }
  };

  return (
    <Popup title="Письмо курьерам" width={480} onClose={() => close({ ok: false })}>
      <div style={{ display: "grid", gap: 12, fontFamily: v.font, color: v.text }}>
        <div style={{ color: v.textDim, fontSize: 13 }}>
          Станция: <b style={{ color: v.gold }}>{STATION_NAMES[letter.station] ?? letter.station}</b>. Письмо найдут здесь другие курьеры.
        </div>
        <textarea
          autoFocus
          value={text}
          maxLength={LETTER_MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder="Что ты узнал? Что видел? Чего не стоит делать на ярусе?"
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            resize: "none",
            borderRadius: 8,
            border: `1px solid ${v.panelEdge}`,
            background: "rgba(0,0,0,.35)",
            color: v.text,
            font: "inherit",
            fontSize: 15,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", color: v.textDim, fontSize: 12 }}>
          <span>Письмо стоит 1 марку. У тебя: {me.stamps}.</span>
          <span>
            {text.length} / {LETTER_MAX}
          </span>
        </div>
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(214,92,64,.55)",
            background: "rgba(120,30,20,.25)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <b>Модерация может вас забанить и удалить все ваши письма.</b> Письма публичны. Оскорбления, ссылки, реклама
          и спам запрещены; такие письма удаляются, а автор может потерять доступ к игре.
        </div>
        {me.stamps < 1 && (
          <div style={{ color: v.gold, fontSize: 13 }}>Марок нет. Прочти чужие письма на станции — за каждое дают марку.</div>
        )}
        {err && <div style={{ color: "#ff8a70", fontSize: 13 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button tone="grey" onClick={() => close({ ok: false })}>
            Отмена
          </Button>
          <Button busy={busy} disabled={!can} onClick={() => void send()}>
            Отправить капсулой
          </Button>
        </div>
      </div>
    </Popup>
  );
}

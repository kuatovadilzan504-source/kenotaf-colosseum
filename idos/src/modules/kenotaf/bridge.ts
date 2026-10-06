import type { IDosGamesClient } from "@idosgames/core";
import * as be from "./backend";
import { ENDING_NAMES, GUARD_NAMES, STANDS, STATION_NAMES } from "./ids";
import { getKz, setKz, subscribeKz, type Courier } from "./store";

// The game (an iframe of the same origin) tells the host what the courier did; the host enters it in
// the Book, the leaderboards and the chain, and answers with what the game should show. The wire format
// is the one in game/js/core/chain.js: {kz:1, t, id?, …}; a request carries id, its answer {kz:1, reply:id}.

type Msg = { kz: 1; t: string; id?: number } & Record<string, unknown>;

export interface Bridge {
  attach(frame: HTMLIFrameElement): void;
  dispose(): void;
  /** Called by the game's scene when the session is ready; pushes the courier to the game. */
  push(): void;
}

export function createBridge(client: IDosGamesClient): Bridge {
  let frame: HTMLIFrameElement | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let unsub: (() => void) | undefined;

  const send = (m: Record<string, unknown>): void => {
    frame?.contentWindow?.postMessage({ kz: 1, ...m }, location.origin);
  };
  const reply = (id: number | undefined, body: Record<string, unknown>): void => {
    if (id !== undefined) send({ reply: id, ...body });
  };
  const toast = (text: string): void => send({ t: "toast", text });

  const me = (): Courier | null => getKz().me;

  const push = (): void => {
    const c = me();
    if (!c) return;
    send({ t: "session", me: { no: c.no, wallet: c.wallet, short: c.wallet ? be.shortWallet(c.wallet) : "", stamps: c.stamps } });
  };

  const scheduleSave = (): void => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void be.pushSave(client), 15_000);
  };

  async function handle(m: Msg): Promise<void> {
    const c = me();
    switch (m.t) {
      case "hello":
        push();
        return;
      case "save":
        scheduleSave();
        return;
      case "ui":
        if (m.what === "book") setKz({ book: true });
        return;
      case "lore": {
        if (!c) return;
        const id = String(m.id);
        const [r] = await Promise.all([be.record(client, c, "read", id), be.submit(client, "lore", Number(m.total) || 0)]);
        if (r.isNew) toast(`ЗАПИСЬ №${id} ВНЕСЕНА В КНИГУ УЧЁТА. ЧИТАЛИ: ${r.count}`);
        return;
      }
      case "guard": {
        if (!c) return;
        const id = String(m.id);
        const r = await be.record(client, c, "guard", id);
        const name = (GUARD_NAMES[id] ?? id).toUpperCase();
        if (r.isNew) toast(`СТРАЖ «${name}» ПОБЕЖДЁН. В КНИГЕ — ТЫ ${r.count}-Й КУРЬЕР, КТО ЭТО СДЕЛАЛ`);
        return;
      }
      case "stand": {
        if (!c) return;
        const id = String(m.id);
        const st = STANDS[id];
        if (!st) return;
        await be.submit(client, st.board, Number(m.ms) || 0);
        if (m.par) {
          const r = await be.record(client, c, "stand", id, Number(m.ms) || undefined);
          if (r.isNew) toast(`${st.name.toUpperCase()}: ПРОЙДЕН В НОРМУ. ЗАПИСАНО В КНИГУ`);
        }
        return;
      }
      case "exam": {
        if (!c) return;
        const ms = Number(m.ms) || 0;
        await be.submit(client, "exam", ms);
        const r = await be.record(client, c, "exam", "council", ms);
        if (r.isNew) toast(`ЭКЗАМЕН СОВЕТА СДАН. В КНИГЕ — ТЫ ${r.count}-Й КУРЬЕР, КТО ЕГО СДАЛ`);
        return;
      }
      case "ending": {
        if (!c) return;
        const kind = m.kind === "truth" ? "truth" : "door";
        const r = await be.record(client, c, "end", kind);
        const [door, truth] = await Promise.all([be.counter(client, "end:door"), be.counter(client, "end:truth")]);
        const mine = kind === "truth" ? truth : door;
        const all = Math.max(1, door + truth);
        toast(`КОНЦОВКА «${ENDING_NAMES[kind]?.toUpperCase()}»${r.isNew ? " ЗАПИСАНА В КНИГУ" : ""}. ТАК ЗАКОНЧИЛИ ${mine} ИЗ ${all} КУРЬЕРОВ`);
        return;
      }
      case "letters": {
        if (!c) return reply(m.id, { ok: false, msg: "ПОЧТА ПРИНИМАЕТ ТОЛЬКО КУРЬЕРОВ С НОМЕРОМ." });
        try {
          const r = await be.lettersAt(client, c, String(m.station));
          reply(m.id, { ok: true, letters: r.letters, seen: r.seen });
        } catch (e) {
          reply(m.id, { ok: false, msg: "КАПСУЛА С ПИСЬМАМИ ЗАСТРЯЛА В ТРУБЕ." });
          console.warn("[kenotaf] letters", e);
        }
        return;
      }
      case "letterRead": {
        if (!c) return;
        const got = await be.markRead(client, c, String(m.id), Number(m.no) || 0);
        if (got) toast("+1 МАРКА ЗА ПРОЧИТАННОЕ ЧУЖОЕ ПИСЬМО");
        return;
      }
      case "write": {
        if (!c) return reply(m.id, { ok: false, msg: "ПИСАТЬ МОЖНО, ТОЛЬКО ПРИНЯВ ПРИСЯГУ КУРЬЕРА." });
        const station = String(m.station);
        if (!STATION_NAMES[station]) return reply(m.id, { ok: false, msg: "С ЭТОЙ СТАНЦИИ ПИСЬМА НЕ УХОДЯТ." });
        setKz({ letter: { station, done: (r) => reply(m.id, r) } });
        return;
      }
    }
  }

  const onMessage = (e: MessageEvent): void => {
    const d = e.data as Msg | undefined;
    if (!d || d.kz !== 1 || e.origin !== location.origin) return;
    if (!frame || e.source !== frame.contentWindow) return;
    void handle(d).catch((err) => console.warn("[kenotaf] bridge", d.t, err));
  };

  return {
    attach(f) {
      frame = f;
      window.addEventListener("message", onMessage);
      // the game sees every change of the courier's numbers (stamps) at once
      unsub = subscribeKz(push);
    },
    dispose() {
      window.removeEventListener("message", onMessage);
      unsub?.();
      clearTimeout(saveTimer);
      void be.pushSave(client);
      frame = null;
    },
    push,
  };
}

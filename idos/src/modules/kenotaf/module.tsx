import { defineModule, type EngineScene, type Module } from "@idosgames/module-sdk";
import type { ReactNode } from "react";
import * as be from "./backend";
import { createBridge, type Bridge } from "./bridge";
import { gameFrame, getKz, setKz, type Courier } from "./store";
import { BookPanel } from "./ui/BookPanel";
import { LetterDialog } from "./ui/LetterDialog";

// КЕНОТАФ — a diesel-punk metroidvania on vanilla JS/Canvas (../../../../game). The game is served
// unchanged at ./game/index.html (scripts/sync-game.mjs copies it) and mounted as a same-origin iframe;
// game/js/core/chain.js is its only knowledge of this host. The host owns the identity (wallet sign-in
// happened before this module runs), the Book of the Council, the records, the letters and the seal.

function Overlay(): ReactNode {
  return (
    <>
      <BookPanel />
      <LetterDialog />
    </>
  );
}

export const kenotafModule: Module = defineModule({
  id: "kenotaf",
  meta: { name: "КЕНОТАФ", type: "game", genre: "metroidvania", engine: "dom" },
  setup(ctx) {
    let frame: HTMLIFrameElement | null = null;
    let bridge: Bridge | null = null;
    let ready: Promise<void> = Promise.resolve();

    // The session is opened before the game starts, so the menu already shows the courier, and the
    // newer of the cloud and the local save is in localStorage by the time the game reads it.
    async function start(host: HTMLElement): Promise<void> {
      const client = ctx.client;
      let me: Courier | null = null;
      try {
        me = await be.openSession(client);
        setKz({ me });
        await be.restoreSave(client);
        void be.backfill(client, me).catch((e) => console.warn("[kenotaf] backfill", e));
      } catch (e) {
        console.warn("[kenotaf] session", e);
      }
      frame = document.createElement("iframe");
      frame.src = `${import.meta.env.BASE_URL}game/index.html`;
      frame.title = "КЕНОТАФ";
      frame.allow = "autoplay; fullscreen; gamepad";
      frame.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;background:#000";
      gameFrame.el = frame;
      host.appendChild(frame);
      bridge = createBridge(client);
      bridge.attach(frame);
      await new Promise<void>((res) => {
        frame?.addEventListener("load", () => res(), { once: true });
        setTimeout(res, 10_000);
      });
      bridge.push();
    }

    const scene: EngineScene = {
      surface: "fullbleed-canvas",
      mount({ host }) {
        ready = start(host);
      },
      ready: () => ready,
      activate() {
        if (frame) frame.style.display = "block";
        gameFrame.el?.focus();
      },
      suspend() {
        if (frame) frame.style.display = "none";
      },
      destroy() {
        bridge?.dispose();
        frame?.remove();
        frame = null;
        gameFrame.el = null;
        setKz({ me: null, book: false, letter: null });
      },
      capture() {
        // The game draws into #game of the iframe (WebGL or 2D); null → the host uses the cover.
        const cv = frame?.contentDocument?.getElementById("game") as HTMLCanvasElement | null;
        return new Promise((resolve) => (cv ? cv.toBlob(resolve, "image/png") : resolve(null)));
      },
    };
    ctx.registerScene(scene);
    ctx.registerPanel({ id: "overlay", slot: "overlay", activeOnly: false, component: Overlay });
    ctx.registerRoute({ id: "kenotaf", label: "КЕНОТАФ", icon: "🛗" });
    ctx.exposeToAgent({
      state: () => ({ ui: "iframe", mode: ctx.modes.current(), courier: getKz().me?.no ?? null }),
      describeActions: {},
    });
  },
});

import { useSyncExternalStore } from "react";

export interface Courier {
  no: number;
  userId: string;
  wallet: string | null;
  name: string;
  stamps: number;
  guest: boolean;
}

export interface DepotItem {
  moduleId: string;
  asset: string;
  /** Who holds the Core asset on Solana right now (null: burned or unknown). */
  owner: string | null;
  mine: boolean;
}
export interface Depot {
  items: DepotItem[];
  /** Modules the courier's wallet holds → the game honours them. */
  own: string[];
  /** Modules once written to this courier's wallet that it no longer holds → the game takes them away. */
  lost: string[];
}

export interface KzState {
  me: Courier | null;
  /** The Book of the Council (ledger, records, tallies, letters) is open. */
  book: boolean;
  /** The letter dialog is open for this station; `done` answers the game's pending request. */
  /** Which tab the Book opens on (the game's station menu opens the depot). */
  bookTab: string | null;
  /** The courier's modules on chain, as last synchronised; the Depot tab reads it. */
  depot: Depot | null;
  letter: { station: string; done: (r: { ok: boolean; msg?: string }) => void } | null;
}

let state: KzState = { me: null, book: false, bookTab: null, depot: null, letter: null };
const subs = new Set<() => void>();

export const getKz = (): KzState => state;
export function setKz(patch: Partial<KzState>): void {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}
export function patchMe(patch: Partial<Courier>): void {
  if (state.me) setKz({ me: { ...state.me, ...patch } });
}
export const subscribeKz = (f: () => void): (() => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
export const useKz = (): KzState => useSyncExternalStore(subscribeKz, getKz);

/** The game's iframe, so a dialog can hand the keyboard back to the game when it closes. */
export const gameFrame: { el: HTMLIFrameElement | null } = { el: null };
export function focusGame(): void {
  setTimeout(() => {
    gameFrame.el?.focus();
    gameFrame.el?.contentWindow?.focus();
  }, 60);
}

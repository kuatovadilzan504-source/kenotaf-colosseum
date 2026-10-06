import { useState, type CSSProperties, type ReactNode } from "react";
import type { IDosGamesClient } from "@idosgames/core";
import type { RenderLinkWallet } from "@idosgames/app-shell";
import {
  isEmbeddedInPlatform,
  linkWalletSolana,
  loginWithWalletSolana,
  loginWithWalletViaPlatform,
} from "@idosgames/wallet";
import type { LoginScreenExtras } from "./base/login/LoginScreen";
import { NETWORK_ID } from "./modules/kenotaf/ids";
import { connectWallet, findProvider, messageSigner } from "./modules/kenotaf/wallet";

// Wallet sign-in for a SOLANA title (devnet), in the courier's words: the signature IS the oath.
//
//  - Inside idosgames.com's frame the SITE's wallet signs (`loginWithWalletViaPlatform`) — the game
//    never opens a wallet there.
//  - On the game's own address the courier's wallet extension (Phantom, Solflare, Backpack) signs the
//    server's challenge: `requestWalletChallenge` → `signMessage` → `loginWithWallet`. No transaction,
//    no fee, no WalletConnect project: it is proof of ownership only.
//
// The same signature is what ties the Book of the Council to the wallet: the account IS the address.

const hint: CSSProperties = { marginTop: 6, fontSize: 12, color: "#ff9a80", lineHeight: 1.4 };

function explain(stage: string | undefined, error: string | undefined): string {
  const e = error ?? "";
  if (/reject|denied|cancel/i.test(e)) return "Подпись отклонена.";
  if (/PLATFORM_WALLET_UNAVAILABLE/.test(e)) return "Сайт не ответил на запрос подписи. Подключи кошелёк на idosgames.com или открой игру на её адресе.";
  if (/WALLET_USE_SITE_PANEL/.test(e)) return "Здесь кошелёк подключается на сайте idosgames.com.";
  if (e === "NO_WALLET") return "Кошелёк не найден. Установи Phantom, Solflare или Backpack и обнови страницу.";
  return `Вход не удался (${stage ?? "?"}): ${e.slice(0, 140)}`;
}

function OathButton(props: {
  client: IDosGamesClient;
  onDone: () => void;
  disabled: boolean;
  style?: CSSProperties;
  link?: boolean;
}): ReactNode {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const embedded = isEmbeddedInPlatform();
  const noExtension = !embedded && !findProvider();

  const click = async (): Promise<void> => {
    setBusy(true);
    setErr("");
    try {
      let result: { ok: boolean; stage?: string; error?: string };
      if (embedded) {
        result = await loginWithWalletViaPlatform({ client: props.client, networkID: NETWORK_ID, family: "solana" });
      } else {
        const { provider, address } = await connectWallet();
        const p = { client: props.client, networkID: NETWORK_ID, walletAddress: address, signMessage: messageSigner(provider) };
        result = props.link ? await linkWalletSolana(p) : await loginWithWalletSolana(p);
      }
      if (!result.ok) setErr(explain(result.stage, result.error));
      else props.onDone();
    } catch (e) {
      setErr(explain(undefined, e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" style={props.style} disabled={props.disabled || busy} onClick={() => void click()}>
        {busy ? "Подпись…" : props.link ? "Привязать кошелёк" : "Принять присягу кошельком Solana"}
      </button>
      {noExtension && (
        <div style={hint}>
          Кошелёк не найден. Нужен{" "}
          <a href="https://phantom.app" target="_blank" rel="noreferrer" style={{ color: "#ffd24a" }}>
            Phantom
          </a>{" "}
          (сеть Devnet) — или играй гостем: записи будут, печать в Solana — нет.
        </div>
      )}
      {err && <div style={hint}>{err}</div>}
    </>
  );
}

export const renderWalletLogin: LoginScreenExtras["renderWalletLogin"] = ({ client, onAuthenticated, disabled, style }) => (
  <OathButton client={client} onDone={onAuthenticated} disabled={disabled} style={style} />
);

// "Link wallet" on the play-access screen of a gated title — kept for completeness; this title is Open.
export const renderWalletLink: RenderLinkWallet = ({ client, onLinked, disabled, style }) => (
  <OathButton client={client} onDone={() => onLinked?.(null)} disabled={disabled} style={style} link />
);

// Every name the game shares with the backend, in one place. The Title's config (data collections and
// leaderboards) is generated for two namespaces by scripts/gen-config.mjs: "kz_" is what players use,
// "dev_" is a twin for tests (its records may be deleted by their owner, so test scripts clean up).
// A local run points at the twin with VITE_KZ_NS=dev_ in .env.local; a production build never sets it.

export const NS: string = import.meta.env.VITE_KZ_NS ?? "kz_";

export const COL = {
  ledger: `${NS}ledger`,
  letters: `${NS}letters`,
  reads: `${NS}reads`,
  couriers: `${NS}couriers`,
  assets: `${NS}assets`,
  parcels: `${NS}parcels`,
} as const;

export const board = (id: string): string => `${NS}${id}`;

/**
 * The chain the game runs on: Solana mainnet. Local testing can switch to devnet (free SOL) with
 * VITE_KZ_CHAIN=devnet in .env.local; a production build never sets it.
 */
const DEVNET = import.meta.env.VITE_KZ_CHAIN === "devnet";
/** NetworkID of the Title's Solana network (cfg.Blockchain.Networks). */
export const NETWORK_ID = DEVNET ? "solana-devnet" : "solana";
/** A public mainnet RPC that answers browsers (api.mainnet-beta.solana.com refuses them with 403). */
export const RPC_URL = DEVNET ? "https://api.devnet.solana.com" : "https://solana-rpc.publicnode.com";
const cluster = DEVNET ? "?cluster=devnet" : "";
export const explorerTx = (sig: string): string => `https://explorer.solana.com/tx/${sig}${cluster}`;
export const explorerAddr = (a: string): string => `https://explorer.solana.com/address/${a}${cluster}`;

/** Where the game lives on its own address — the only place a wallet extension may sign transactions. */
export const OWN_ADDRESS = "https://16kma60r.idos.games";

export const STATION_NAMES: Record<string, string> = {
  hub: "Насосная станция",
  atrium: "Соты-Атриум",
  post: "Главпочтамт",
  eden: "Оранжереи",
  seal: "Предпечатье",
  archive: "Прихожая Архива",
};

export const GUARD_NAMES: Record<string, string> = {
  overseer: "Надсмотрщик",
  primarch: "Примарх",
  uprooter: "Корчеватель",
  regulator: "Регулятор",
  archivist: "Архивариус",
};

/** Test stands (js/world/trials.js) → their leaderboards. */
export const STANDS: Record<string, { board: string; name: string }> = {
  z1_trial: { board: "stand_z1", name: "Стенд обходчиков" },
  z2_trial: { board: "stand_z2", name: "Крышный пробег" },
  z3_trial: { board: "stand_z3", name: "Траверса теплиц" },
  z4_trial: { board: "stand_z4", name: "Проба хода" },
  z5_trial: { board: "stand_z5", name: "Экзамен почтальона" },
};

export const BOARDS: Array<{ id: string; name: string; unit: "ms" | "n" }> = [
  { id: "lore", name: "Прочитано цилиндров", unit: "n" },
  { id: "exam", name: "Экзамен Совета (5 стражей)", unit: "ms" },
  ...Object.values(STANDS).map((s) => ({ id: s.board, name: s.name, unit: "ms" as const })),
];

export const LORE_TOTAL = 30;
export const ENDING_NAMES: Record<string, string> = { door: "Дверь", truth: "Правда" };

export const LETTER_MAX = 140;

/** The twelve backpack modules of the game (js/world/systems.js MODULE_IDS), in the game's order. */
export const MODULES: Record<string, string> = {
  mark_long: 'ЖИРНЫЙ МЕЛ',
  heavy_fast: 'ТЯЖЁЛАЯ РУКОЯТЬ',
  stun_long: 'ЗУБИЛО ЧАСОВЩИКА',
  evade_win: 'ГИРОСКОП ОБХОДЧИКА',
  scrap_magnet: 'МАГНИТ ЛОМА',
  pulse_wide: 'ШИРОКОЕ СОПЛО',
  weld_parry: 'ОТРАЖАТЕЛЬ',
  felt_soles: 'ВОЙЛОЧНЫЕ ПОДОШВЫ',
  long_cable: 'ДЛИННЫЙ ТРОС',
  ram_valve: 'ТАРАННЫЙ КЛАПАН',
  cold_core: 'ХОЛОДНЫЙ КОТЁЛ',
  vent_burst: 'СБРОСНОЙ КЛАПАН',
};

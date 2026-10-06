// Every name the game shares with the backend, in one place. The Title's config (data collections and
// leaderboards) is generated for two namespaces by scripts/gen-config.mjs: "kz_" is what players use,
// "dev_" is a twin for tests (its records may be deleted by their owner, so test scripts clean up).
// A local run points at the twin with VITE_KZ_NS=dev_ in .env.local; a production build never sets it.

export const NS: string = import.meta.env.VITE_KZ_NS ?? "kz_";

export const COL = {
  ledger: `${NS}ledger`,
  letters: `${NS}letters`,
  reads: `${NS}reads`,
} as const;

export const board = (id: string): string => `${NS}${id}`;

/** NetworkID of the Title's Solana network (cfg.Blockchain.Networks). ChainID 103 = devnet. */
export const NETWORK_ID = "solana-devnet";
export const DEVNET_RPC = "https://api.devnet.solana.com";

/** Where the game lives on its own address — the only place a wallet extension may sign transactions. */
export const OWN_ADDRESS = "https://xv979cyc.idos.games";

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

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Namespace of data collections and leaderboards: "kz_" (default, players) or "dev_" (tests). */
  readonly VITE_KZ_NS?: string;
  readonly VITE_KZ_CHAIN?: string;
}

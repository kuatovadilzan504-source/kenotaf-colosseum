// Copies ../game into public/game so the host serves the untouched game at ./game/index.html.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
const src = fileURLToPath(new URL("../../game", import.meta.url));
const dst = fileURLToPath(new URL("../public/game", import.meta.url));
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
console.log("game synced → public/game");

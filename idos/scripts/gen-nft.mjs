// Metadata and a brass plate for each of the twelve backpack modules (what a courier's Core NFT points at).
// Names and descriptions are read from the game's own table, so the NFT never disagrees with the game.
// Usage: node scripts/gen-nft.mjs   → public/nft/<id>.json + <id>.svg
import fs from "node:fs";

const BASE = "https://xv979cyc.idos.games/nft/";
const src = fs.readFileSync(new URL("../../game/js/world/systems.js", import.meta.url), "utf8");
const ids = /const MODULE_IDS=\[([^\]]+)\]/.exec(src)[1].split(",").map((s) => s.replace(/['\s]/g, ""));
const out = new URL("../public/nft/", import.meta.url);
fs.mkdirSync(out, { recursive: true });

const wrap = (text, n) => {
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if ((cur + " " + w).trim().length > n) { lines.push(cur.trim()); cur = w; } else cur += " " + w;
  }
  return [...lines, cur.trim()].filter(Boolean);
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

for (const id of ids) {
  const m = new RegExp("(?:^|[^a-z_])" + id + ":[{]name:'([^']+)',desc:'([^']+)'").exec(src);
  if (!m) throw new Error("module not found in UPGRADES: " + id);
  const [, name, desc] = m;
  const title = wrap(name, 14);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d98a"/><stop offset=".55" stop-color="#b08d3e"/><stop offset="1" stop-color="#5e4712"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#2a241a"/><stop offset="1" stop-color="#0b0906"/></radialGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<rect x="28" y="28" width="456" height="456" rx="18" fill="none" stroke="url(#b)" stroke-width="10"/>
<rect x="46" y="46" width="420" height="420" rx="10" fill="none" stroke="#6d5416" stroke-width="2"/>
${[[64, 64], [448, 64], [64, 448], [448, 448]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="url(#b)"/><path d="M${x - 5} ${y}h10" stroke="#2a1f08" stroke-width="2"/>`).join("")}
<g transform="translate(256 190)" fill="none" stroke="url(#b)" stroke-width="9" stroke-linejoin="round">
<circle r="46"/><circle r="16"/>
${Array.from({ length: 8 }, (_, i) => `<rect x="-9" y="-70" width="18" height="24" transform="rotate(${i * 45})" fill="#b08d3e" stroke="none"/>`).join("")}
</g>
<g font-family="Oswald,Impact,'Arial Narrow',sans-serif" text-anchor="middle" fill="#f1d98a">
<text x="256" y="92" font-size="20" letter-spacing="8" fill="#a8924c">МОДУЛЬ РАНЦА</text>
${title.map((l, i) => `<text x="256" y="${318 + i * 40}" font-size="34" letter-spacing="3">${esc(l)}</text>`).join("")}
<text x="256" y="438" font-size="16" letter-spacing="6" fill="#a8924c">КЕНОТАФ · КУРЬЕР</text>
</g></svg>
`;
  fs.writeFileSync(new URL(`${id}.svg`, out), svg);
  fs.writeFileSync(
    new URL(`${id}.json`, out),
    JSON.stringify(
      {
        name,
        symbol: "KZMOD",
        description: `${desc} Модуль ранца курьера из игры КЕНОТАФ: пока кошелёк владеет им, он работает в игре.`,
        image: `${BASE}${id}.svg`,
        external_url: "https://xv979cyc.idos.games/",
        attributes: [{ trait_type: "Module", value: id }, { trait_type: "Game", value: "КЕНОТАФ" }],
        properties: { category: "image", files: [{ uri: `${BASE}${id}.svg`, type: "image/svg+xml" }] },
      },
      null,
      2,
    ),
  );
}
console.log(`${ids.length} modules → public/nft/`);
export {};

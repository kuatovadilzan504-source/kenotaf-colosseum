// Zips the CONTENTS of a folder (index.html at the zip root, forward slashes) for begin_build_upload.
// Usage: node scripts/make-zip.mjs dist ../build.zip
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [src = "dist", out = "build.zip"] = process.argv.slice(2);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(src);

const chunks = [];
const central = [];
let offset = 0;
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

for (const file of files) {
  const name = Buffer.from(path.relative(src, file).split(path.sep).join("/"), "utf8");
  const data = fs.readFileSync(file);
  const comp = zlib.deflateRawSync(data, { level: 9 });
  const crc = zlib.crc32(data);
  const st = fs.statSync(file);
  const t = dosTime(st.mtime), d = dosDate(st.mtime);
  const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(t), u16(d), u32(crc), u32(comp.length), u32(data.length), u16(name.length), u16(0), name]);
  chunks.push(local, comp);
  central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(t), u16(d), u32(crc), u32(comp.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
  offset += local.length + comp.length;
}
const cd = Buffer.concat(central);
const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0)]);
fs.writeFileSync(out, Buffer.concat([...chunks, cd, end]));
console.log(`${files.length} files → ${out} (${(fs.statSync(out).size / 1e6).toFixed(2)} MB)`);

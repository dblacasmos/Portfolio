// scripts/scan-duplicates.mjs
import fs from "node:fs";
import path from "node:path";
import { walk, findExistingRoots, hashFile, rel, ensureDir } from "./lib/fs-utils.mjs";
import cfg from "./config.vram.mjs";

const repoRoot = process.cwd();
const useHardlinks = process.argv.includes("--hardlink");
const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".bmp", ".tga", ".gif", ".webp", ".avif", ".ktx2"]);
const roots = findExistingRoots(cfg.imgDirs.map((p) => path.join(repoRoot, p)));

const hashes = new Map();
const groups = new Map();

for (const root of roots) {
  for (const file of walk(root)) {
    const ext = path.extname(file).toLowerCase();
    if (!IMG_EXT.has(ext)) continue;
    try {
      const h = hashFile(file);
      hashes.set(file, h);
      if (!groups.has(h)) groups.set(h, []);
      groups.get(h).push(rel(repoRoot, file));
    } catch { }
  }
}

const duplicates = Array.from(groups.values()).filter((arr) => arr.length > 1);
ensureDir(path.join(repoRoot, "build-reports"));
const outJson = path.join(repoRoot, "build-reports", "duplicates.json");
fs.writeFileSync(outJson, JSON.stringify({ createdAt: new Date().toISOString(), duplicates }, null, 2));

console.log(`Duplicate scan: ${duplicates.length} duplicate groups found.`);
console.log(`Report -> ${rel(repoRoot, outJson)}`);

// Auto-dedupe con hardlinks (opcional)
if (useHardlinks && duplicates.length) {
  let linked = 0, failed = 0;
  for (const group of duplicates) {
    const abs = group.map((p) => path.join(repoRoot, p));
    const canonical = abs[0]; // primer archivo del grupo
    for (const f of abs.slice(1)) {
      try {
        // Solo en el mismo dispositivo (NTFS ext4 APFS). Si falla, seguimos.
        const tmp = f + ".tmp.__hl";
        fs.linkSync(canonical, tmp);   // crea hardlink temporal
        fs.rmSync(f, { force: true }); // elimina duplicado
        fs.renameSync(tmp, f);         // deja el hardlink con el nombre original
        console.log("HLNK", rel(repoRoot, f), "→", rel(repoRoot, canonical));
        linked++;
      } catch (e) {
        failed++;
        console.warn("HLNK_FAIL", rel(repoRoot, f), e?.message ?? e);
      }
    }
  }
  console.log(`Hardlink dedupe: ${linked} files linked, ${failed} failed.`);
}

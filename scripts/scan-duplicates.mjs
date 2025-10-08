// scripts/scan-duplicates.mjs
// Escanea imágenes/ktx2 y detecta duplicados por hash.
// Fix: evita incluir el mismo archivo dos veces si cae bajo múltiples raíces.
import fs from "node:fs";
import path from "node:path";
import { walk, findExistingRoots, hashFile, rel, ensureDir } from "./lib/fs-utils.mjs";
import cfg from "./config.vram.mjs";

const repoRoot = process.cwd();
const useHardlinks = process.argv.includes("--hardlink");
const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".bmp", ".tga", ".gif", ".webp", ".avif", ".ktx2"]);
const roots = findExistingRoots(cfg.imgDirs.map((p) => path.join(repoRoot, p)));

// Para no recontar el mismo fichero si aparece por varias raíces
const seenAbs = new Set();

const hashes = new Map(); // absPath -> hash
const groups = new Map(); // hash -> Set<relPath>

for (const root of roots) {
  for (const file of walk(root)) {
    const ext = path.extname(file).toLowerCase();
    if (!IMG_EXT.has(ext)) continue;

    const abs = path.resolve(file);
    if (seenAbs.has(abs)) continue;
    seenAbs.add(abs);

    try {
      const h = hashFile(abs);
      hashes.set(abs, h);
      if (!groups.has(h)) groups.set(h, new Set());
      groups.get(h).add(rel(repoRoot, abs));
    } catch { }
  }
}

// Salida sin duplicados idénticos A==A
const duplicates = Array.from(groups.values())
  .map((s) => Array.from(s))
  .filter((arr) => arr.length > 1);

ensureDir(path.join(repoRoot, "build-reports"));
const outJson = path.join(repoRoot, "build-reports", "duplicates.json");
fs.writeFileSync(outJson, JSON.stringify({ createdAt: new Date().toISOString(), duplicates }, null, 2));

console.log(`Duplicate scan: ${duplicates.length} duplicate groups found.`);
console.log(`Report -> ${rel(repoRoot, outJson)}`);

// Hardlink auto-dedupe (opcional)
if (useHardlinks && duplicates.length) {
  let linked = 0, failed = 0;
  for (const group of duplicates) {
    const abs = group.map((p) => path.join(repoRoot, p));
    const canonical = abs[0];
    for (const f of abs.slice(1)) {
      try {
        // Solo si están en el mismo dispositivo
        const tmp = f + ".tmp.__hl";
        fs.linkSync(canonical, tmp);
        fs.rmSync(f, { force: true });
        fs.renameSync(tmp, f);
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

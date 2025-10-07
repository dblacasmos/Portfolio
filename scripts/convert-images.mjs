// scripts/convert-images.mjs (v3: toktx flags fix; no --zcmp for etc1s)
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import sharp from "sharp";
import pLimit from "p-limit";
import { walk, findExistingRoots, rel } from "./lib/fs-utils.mjs";
import cfg from "./config.vram.mjs";

const repoRoot = process.cwd();
const IMG_EXT_SRC = new Set([".png", ".jpg", ".jpeg"]);
const roots = findExistingRoots(cfg.imgDirs.map((p) => path.join(repoRoot, p)));
const limit = pLimit(cfg.concurrency);

function hasToktx() { try { const r = spawnSync("toktx", ["--version"], { stdio: "ignore" }); return r.status === 0; } catch { return false; } }
const TOKTX = hasToktx();
if (!TOKTX) { console.warn("\n[WARN] 'toktx' no encontrado en PATH. Se omite KTX2.\n"); }

const isUI = (f) => cfg.uiInclude.some(rx => rx.test(f));
const wantsUASTC = (f) => cfg.uastcInclude.some(rx => rx.test(f));

function shouldGenMipmap(src) {
  // por defecto según config
  let gen = cfg.textures?.genMipmapDefault !== false;
  // si coincide con noMipmapInclude => desactiva
  if (Array.isArray(cfg.textures?.noMipmapInclude)) {
    if (cfg.textures.noMipmapInclude.some((rx) => rx.test(src))) gen = false;
  }
  // si coincide con yesMipmapInclude => activa (gana sobre noMipmap)
  if (Array.isArray(cfg.textures?.yesMipmapInclude)) {
    if (cfg.textures.yesMipmapInclude.some((rx) => rx.test(src))) gen = true;
  }
  return gen;
}

async function toAVIFWebP(src) {
  const dir = path.dirname(src); const base = path.basename(src, path.extname(src));
  const avif = path.join(dir, base + ".avif"); const webp = path.join(dir, base + ".webp");
  try {
    if (!fs.existsSync(avif)) { await sharp(src).avif({ quality: 60 }).toFile(avif); console.log("AVIF  ", rel(repoRoot, avif)); }
    if (!fs.existsSync(webp)) { await sharp(src).webp({ quality: 82, effort: 5 }).toFile(webp); console.log("WebP  ", rel(repoRoot, webp)); }
  } catch (e) { console.warn("[AVIF/WebP] Failed:", rel(repoRoot, src), e.message); }
}

async function toKTX2(src) {
  if (!TOKTX) return;
  const dir = path.dirname(src); const base = path.basename(src, path.extname(src));
  const out = path.join(dir, base + ".ktx2"); if (fs.existsSync(out)) return;
  const args = ["--t2"];
  if (wantsUASTC(src)) {
    // UASTC permite zstd (--zcmp). Calidad 0..4 (2 por defecto) + mipmaps opcionales.
    args.push("--encode", "uastc", "--uastc", String(cfg.ktx2.uastcRate ?? 2));
    args.push("--zcmp", String(cfg.ktx2.zstdLevel ?? 18));
  } else {
    // ETC1S NO admite --zcmp al mismo tiempo (ya es BasisLZ). Solo qlevel/clevel.
    args.push("--encode", "etc1s", "--qlevel", String(cfg.ktx2.etc1sQLevel ?? 128), "--clevel", String(cfg.ktx2.etc1sEffort ?? 3));
  }
  if (shouldGenMipmap(src)) args.push("--genmipmap");
  args.push(out, src);
  await new Promise((resolve) => { const ps = spawn("toktx", args, { stdio: "inherit" }); ps.on("close", () => resolve()); });
  console.log("KTX2  ", rel(repoRoot, out));
}

// Dedup
const files = new Set();
for (const root of roots) { for (const f of walk(root)) { const ext = path.extname(f).toLowerCase(); if (IMG_EXT_SRC.has(ext)) files.add(path.resolve(f)); } }
const tasks = [];
for (const f of files) { if (isUI(f)) tasks.push(limit(() => toAVIFWebP(f))); tasks.push(limit(() => toKTX2(f))); }
await Promise.all(tasks);

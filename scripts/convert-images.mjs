// scripts/convert-images.mjs
// v4: reprocesado inteligente, toktx flags coherentes y control de mipmaps por carpeta
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

// Detectar toktx en PATH
function hasToktx() {
  try { return spawnSync("toktx", ["--version"], { stdio: "ignore" }).status === 0; }
  catch { return false; }
}
const TOKTX = hasToktx();
if (!TOKTX) {
  console.warn("\n[WARN] 'toktx' no encontrado en PATH. Se omite generación KTX2.\n");
}

// Heurísticas
const isUI = (f) => cfg.uiInclude.some((rx) => rx.test(f));
const wantsUASTC = (f) => cfg.uastcInclude.some((rx) => rx.test(f));

function shouldGenMipmap(src) {
  // base
  let gen = cfg.textures?.genMipmapDefault !== false;
  // reglas no/yes
  if (Array.isArray(cfg.textures?.noMipmapInclude) && cfg.textures.noMipmapInclude.some((rx) => rx.test(src))) gen = false;
  if (Array.isArray(cfg.textures?.yesMipmapInclude) && cfg.textures.yesMipmapInclude.some((rx) => rx.test(src))) gen = true;
  // forzar sin mips para UI salvo override explícito
  if (isUI(src) && cfg.textures?.yesMipmapInclude?.every?.((rx) => !rx.test(src))) gen = false;
  return gen;
}

// Reproducir avif/webp de apoyo para UI si lo necesitas en HTML (opcional)
async function toAVIFWebP(src) {
  const dir = path.dirname(src);
  const base = path.basename(src, path.extname(src));
  const avif = path.join(dir, base + ".avif");
  const webp = path.join(dir, base + ".webp");
  try {
    if (!fs.existsSync(avif)) {
      await sharp(src).avif({ quality: 60 }).toFile(avif);
      console.log("AVIF  ", rel(repoRoot, avif));
    }
    if (!fs.existsSync(webp)) {
      await sharp(src).webp({ quality: 82, effort: 5 }).toFile(webp);
      console.log("WebP  ", rel(repoRoot, webp));
    }
  } catch (e) {
    console.warn("[AVIF/WebP] Failed:", rel(repoRoot, src), e.message);
  }
}

// Evita reprocesar KTX2 si ya existe y está al día
function isKTX2UpToDate(src, out) {
  try {
    if (!fs.existsSync(out)) return false;
    const si = fs.statSync(src).mtimeMs;
    const so = fs.statSync(out).mtimeMs;
    return so >= si;
  } catch { return false; }
}

async function toKTX2(src) {
  if (!TOKTX) return;
  const dir = path.dirname(src);
  const base = path.basename(src, path.extname(src));
  const out = path.join(dir, base + ".ktx2");
  if (isKTX2UpToDate(src, out)) return;

  const args = ["--t2", "--force-orientation", "--assign_oetf", "sRGB"];
  if (shouldGenMipmap(src)) args.push("--genmipmap");

  if (wantsUASTC(src) || isUI(src)) {
    // UASTC + zstd para UI y elementos de alta fidelidad
    args.push("--encode", "uastc", "--uastc", String(cfg.ktx2.uastcRate ?? 2));
    args.push("--zcmp", String(cfg.ktx2.zstdLevel ?? 18));
  } else {
    // ETC1S no usa --zcmp; control por qlevel/clevel
    args.push("--encode", "etc1s", "--qlevel", String(cfg.ktx2.etc1sQLevel ?? 128));
    args.push("--clevel", String(cfg.ktx2.etc1sEffort ?? 3));
  }

  args.push(out, src);

  await new Promise((resolve) => {
    const ps = spawn("toktx", args, { stdio: "inherit" });
    ps.on("close", () => resolve());
  });
  console.log("KTX2  ", rel(repoRoot, out));
}

// Deduplicar entradas por ruta absoluta
const files = new Set();
for (const root of roots) {
  for (const f of walk(root)) {
    const ext = path.extname(f).toLowerCase();
    if (IMG_EXT_SRC.has(ext)) files.add(path.resolve(f));
  }
}

const tasks = [];
for (const f of files) {
  if (isUI(f)) tasks.push(limit(() => toAVIFWebP(f)));
  tasks.push(limit(() => toKTX2(f)));
}
await Promise.all(tasks);

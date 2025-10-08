// scripts/pack-gltf.mjs (v7)
// - Normaliza texturas .webp/.avif -> .png cuando procede
// - Aplica ETC1S/UASTC según heurística
// - prune + dedup + quantize
// - Draco y Meshopt → “best-of” (elige el menor)
// - Evita reempaquetar si la salida está al día
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import pLimit from "p-limit";
import sharp from "sharp";
import { walk, findExistingRoots, rel } from "./lib/fs-utils.mjs";
import cfg from "./config.vram.mjs";
import { Minimatch } from "minimatch";

const repoRoot = process.cwd();
const roots = findExistingRoots(cfg.modelDirs.map((p) => path.join(repoRoot, p)));
const limit = pLimit(cfg.concurrency);
const summary = [];

const isWin = process.platform === "win32";
const NPM = "npx";
const GLTF = ["-y", "@gltf-transform/cli"];

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const ps = spawn(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
    ps.on("close", (c) => (c === 0 ? res() : rej(new Error(`${cmd} ${args.join(" ")}`))));
  });
}

// Punteros LFS: mensaje claro si el archivo no es el binario real
function isLFSPointer(file) {
  try {
    const head = fs.readFileSync(file, "utf8");
    return head.startsWith("version https://git-lfs.github.com/spec/v1");
  } catch {
    return false;
  }
}
function assertNotLFSPointer(file) {
  if (isLFSPointer(file)) {
    throw new Error(`El archivo parece un puntero de Git LFS: ${file}
Descarga el binario real (git lfs pull) o reemplázalo por el asset real antes de continuar.`);
  }
}

function rmrf(p) { try { fs.rmSync(p, { recursive: true, force: true }); } catch { } }
function unlink(p) { try { fs.unlinkSync(p); } catch { } }

async function normalizeTextures(modelPath) {
  if (!cfg.models?.normalizeWebPInModels) return modelPath;
  assertNotLFSPointer(modelPath);
  const dir = path.dirname(modelPath);
  const base = path.basename(modelPath, path.extname(modelPath));
  const work = path.join(dir, base + ".norm_work");
  const outGLTF = path.join(work, base + ".gltf");
  const backGLB = path.join(dir, base + ".norm.glb");
  fs.mkdirSync(work, { recursive: true });

  // 1) .glb/.gltf -> .gltf (CLI infiere por extensión)
  await run(NPM, [...GLTF, "copy", modelPath, outGLTF]);

  const text = fs.readFileSync(outGLTF, "utf-8");
  if (!text.trim().startsWith("{")) {
    throw new Error(`La salida ${outGLTF} no es JSON. Verifica que ${modelPath} sea válido (no puntero LFS / no corrupto).`);
  }

  // 2) Sustituir .webp/.avif a .png dentro del .gltf y del filesystem del work
  const gltf = JSON.parse(text);
  if (Array.isArray(gltf.images)) {
    for (const img of gltf.images) {
      if (!img || (!img.uri && !img.bufferView)) continue;
      const uri = img.uri || "";
      const lower = String(uri).toLowerCase();
      if (lower.endsWith(".webp") || lower.endsWith(".avif")) {
        const src = path.join(work, uri);
        const dst = path.join(work, uri.replace(/\.(webp|avif)$/i, ".png"));
        await sharp(src).png({ compressionLevel: 9 }).toFile(dst);
        img.uri = path.basename(dst);
        img.mimeType = "image/png";
        unlink(src);
      }
    }
    fs.writeFileSync(outGLTF, JSON.stringify(gltf, null, 2));
  }

  // 3) Volver a .glb embebido
  await run(NPM, [...GLTF, "copy", outGLTF, backGLB]);

  // Limpieza
  rmrf(work);
  try {
    const strayGLTF = path.join(dir, base + ".gltf");
    if (fs.existsSync(strayGLTF)) fs.rmSync(strayGLTF, { force: true });
  } catch { }

  return backGLB;
}

async function pack(input) {
  assertNotLFSPointer(input);

  const safeSize = (p) => { try { return fs.statSync(p).size; } catch { return 0; } };
  const kb = (n) => (n > 0 ? (n / 1024).toFixed(2) : "-");

  const normalized = await normalizeTextures(input);
  const dir = path.dirname(input);
  const base = path.basename(input, path.extname(input));
  const out = path.join(dir, base + ".packed.glb");
  const t1 = path.join(dir, base + ".tmp1.glb");
  const t2 = path.join(dir, base + ".tmp2.glb");

  // Saltar si ya está al día (comparado contra normalizado)
  const FORCE = process.env.PACK_FORCE === "1" || process.argv.includes("--force");
  if (!FORCE && fs.existsSync(out)) {
    try {
      const srcM = fs.statSync(normalized).mtimeMs;
      const outM = fs.statSync(out).mtimeMs;
      if (outM >= srcM) {
        console.log("SKIP ", rel(process.cwd(), out), "(up to date)");
        summary.push({
          name: rel(repoRoot, input),
          inSize: safeSize(input),
          normSize: safeSize(normalized),
          dracoSize: 0,
          meshoptSize: 0,
          packedSize: safeSize(out)
        });
        return;
      }
    } catch { }
  }

  // UASTC vs ETC1S (gltf-transform v4)
  const useUASTC =
    (cfg.uastcInclude || []).some((rx) =>
      rx instanceof RegExp ? rx.test(input) : new Minimatch(String(rx)).match(input)
    );

  if (useUASTC) {
    const q = cfg.ktx2?.uastcQuality ?? 128; // 0..255
    const zl = cfg.ktx2?.zstdLevel ?? 18;
    await run(NPM, [...GLTF, "uastc", normalized, t1, "--level", String(q), "--zstd", String(zl)]);
  } else {
    const quality = cfg.ktx2?.etc1sQLevel ?? 200; // 1..255
    await run(NPM, [...GLTF, "etc1s", normalized, t1, "--quality", String(quality)]);
  }

  await run(NPM, [...GLTF, "prune", t1, t2]);
  await run(NPM, [...GLTF, "dedup", t2, t1]);

  // Cuantización (KHR_mesh_quantization)
  const qPosBits = cfg.quantize?.positionBits;
  const qNormBits = cfg.quantize?.normalBits;
  const qUvBits = cfg.quantize?.texcoordBits;
  if (cfg.quantize?.enabled !== false) {
    const qArgs = ["quantize", t1, t2, "--pattern", "*"];
    if (Number.isFinite(qPosBits)) qArgs.push("--quantizePosition", String(qPosBits));
    if (Number.isFinite(qNormBits)) qArgs.push("--quantizeNormal", String(qNormBits));
    if (Number.isFinite(qUvBits)) qArgs.push("--quantizeTexcoord", String(qUvBits));
    await run(NPM, [...GLTF, ...qArgs]);
  } else {
    fs.renameSync(t1, t2);
  }

  // Draco (ojo con UVs fuera de [0,1] → deja texcoordBits en null)
  const qPos = cfg.draco?.positionBits ?? 14;
  const qUv = cfg.draco?.texcoordBits;
  {
    const args = ["draco", t2, t1, "--method", "edgebreaker", "--quantizePosition", String(qPos)];
    if (Number.isFinite(qUv)) args.push("--quantizeTexcoord", String(qUv));
    await run(NPM, [...GLTF, ...args]);
  }

  // Meshopt y “best-of”
  const mopt = path.join(dir, base + ".mopt.glb");
  await run(NPM, [...GLTF, "meshopt", t1, mopt]);

  try {
    const szDraco = safeSize(t1);
    const szMopt = safeSize(mopt);
    console.log(`best-of: draco=${kb(szDraco)} KB vs meshopt=${kb(szMopt)} KB`);
    if (szMopt > 0 && (szDraco === 0 || szMopt < szDraco)) {
      fs.renameSync(mopt, out);        // gana Meshopt
      fs.rmSync(t1, { force: true });
    } else {
      fs.renameSync(t1, out);          // gana Draco
      fs.rmSync(mopt, { force: true });
    }
  } catch (e) {
    console.warn("best-of compare failed:", e?.message ?? e);
    try { fs.renameSync(t1, out); fs.rmSync(mopt, { force: true }); } catch { }
  }

  summary.push({
    name: rel(repoRoot, input),
    inSize: safeSize(input),
    normSize: safeSize(normalized),
    dracoSize: safeSize(path.join(dir, base + ".tmp1.glb")),
    meshoptSize: safeSize(path.join(dir, base + ".mopt.glb")),
    packedSize: safeSize(out)
  });

  unlink(t1); unlink(t2);
  console.log("GLB   ", rel(repoRoot, out));
}

const MODEL_RX = /\.(glb|gltf)$/i;
const inputs = new Set();
for (const root of roots) {
  for (const f of walk(root)) {
    if (!MODEL_RX.test(f)) continue;
    if (f.includes(".norm_work")) continue;
    if (/\.norm\.(glb|gltf)$/i.test(f)) continue;
    const base = path.basename(f);
    if (cfg.models?.skipPacked && /\.packed(\.|$)/i.test(base)) continue;
    inputs.add(path.resolve(f));
  }
}

const tasks = [];
for (const f of inputs) tasks.push(limit(() => pack(f)));
await Promise.all(tasks);

// Resumen tabular (ligero y útil)
if (summary.length) {
  const pad = (s, n) => String(s).padEnd(n);
  const fmt = (n) => n ? (n / 1024).toFixed(2) + " KB" : "-";
  const tSum = summary.reduce((a, s) => a + s.inSize, 0);
  const pSum = summary.reduce((a, s) => a + s.packedSize, 0);
  const saved = tSum > 0 ? ((1 - pSum / tSum) * 100) : 0;

  console.log("\n=== Build Size Summary ===");
  console.log(pad("Model", 48), pad("In", 10), pad("Norm", 10), pad("Draco", 10), pad("Meshopt", 10), pad("Packed", 10), "Saved");
  for (const s of summary) {
    const savedRow = s.inSize > 0 ? ((1 - s.packedSize / s.inSize) * 100).toFixed(1) + "%" : "-";
    console.log(
      pad(s.name, 48),
      pad((s.inSize / 1024).toFixed(0) + "KB", 10),
      pad((s.normSize / 1024).toFixed(0) + "KB", 10),
      pad(fmt(s.dracoSize), 10),
      pad(fmt(s.meshoptSize), 10),
      pad((s.packedSize / 1024).toFixed(0) + "KB", 10),
      savedRow
    );
  }
  console.log("-".repeat(104));
  console.log(
    pad("TOTAL", 48),
    pad((tSum / 1024).toFixed(0) + "KB", 10),
    pad("-", 10),
    pad("-", 10),
    pad("-", 10),
    pad((pSum / 1024).toFixed(0) + "KB", 10),
    saved.toFixed(1) + "%"
  );
  console.log();
}

// scripts/prebuild.mjs
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

if (process.env.VERCEL || process.env.CI || process.env.SKIP_ASSET_PIPELINE) {
  console.log("[prebuild] CI detectado → salto pipeline de assets");
  process.exit(0);
}

function run(nodeArgs, file) {
  return new Promise((resolve, reject) => {
    const ps = spawn(process.execPath, [...nodeArgs, file], { stdio: "inherit" });
    ps.on("close", (code) => (code === 0 ? resolve() : reject(new Error(file + " exited " + code))));
  });
}

// --- Limpieza mínima de runs anteriores ---
try {
  // elimina cualquier carpeta .../*.norm_work que haya quedado colgada
  const rm = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch { } };
  const roots = ["public/assets/models", "assets/models", "public/models"];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const e of fs.readdirSync(r)) {
      if (e.endsWith(".norm_work")) rm(path.join(r, e));
    }
  }
} catch { }

const base = path.resolve("scripts");
await run(["--experimental-json-modules"], path.join(base, "scan-duplicates.mjs"));
await run(["--experimental-json-modules"], path.join(base, "convert-images.mjs"));
await run(["--experimental-json-modules"], path.join(base, "pack-gltf.mjs"));
// Renombra *.packed.glb → *.glb y limpia intermedios .norm*
await run(["--experimental-json-modules"], path.join(base, "finalize-models.mjs"));

console.log("\nPrebuild completed. See 'build-reports' for details.\n");

// scripts/finalize-models.mjs
// Renombra *.packed.glb → *.glb y limpia *.norm.glb + carpetas *.norm_work
import fs from "node:fs";
import path from "node:path";
import cfg from "./config.vram.mjs";
import { findExistingRoots, walk, rel } from "./lib/fs-utils.mjs";

const repoRoot = process.cwd();
const roots = findExistingRoots(cfg.modelDirs.map((p) => path.join(repoRoot, p)));

const rmrf = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch { } };

let renamed = 0, removedNorm = 0, removedNormDirs = 0;

for (const root of roots) {
    // 1) Renombrar *.packed.glb → *.glb y borrar *.norm.glb
    for (const f of walk(root)) {
        if (f.endsWith(".packed.glb")) {
            const dst = f.replace(".packed.glb", ".glb");
            try { if (fs.existsSync(dst)) fs.rmSync(dst, { force: true }); } catch { }
            fs.renameSync(f, dst);
            console.log("RENAME", rel(repoRoot, dst));
            renamed++;
        } else if (f.endsWith(".norm.glb")) {
            try { fs.rmSync(f, { force: true }); console.log("CLEAN norm", rel(repoRoot, f)); removedNorm++; } catch { }
        }
    }
    // 2) Borrar carpetas *.norm_work en el nivel inmediato del root
    for (const e of fs.readdirSync(root)) {
        const p = path.join(root, e);
        try {
            if (fs.statSync(p).isDirectory() && e.endsWith(".norm_work")) {
                rmrf(p);
                console.log("CLEAN dir", rel(repoRoot, p));
                removedNormDirs++;
            }
        } catch { }
    }
}

console.log(`Finalize models → renamed: ${renamed}, removed .norm.glb: ${removedNorm}, removed .norm_work dirs: ${removedNormDirs}`);

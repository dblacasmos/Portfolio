#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { walk, findExistingRoots, rel } from "./lib/fs-utils.mjs";
import cfg from "./config.vram.mjs";

/**
 * Limpia restos de procesos anteriores:
 *   - directorios *.norm_work (sin descender)
 *   - archivos temporales .tmp*.glb/.gltf
 *   - .norm.glb/gltf y .packed.packed.* redundantes
 */

const repo = process.cwd();
const roots = findExistingRoots(cfg.modelDirs.map((p) => path.join(repo, p)));

const FILE_TRASH = [
    /\.tmp\d*\.(glb|gltf)$/i,
    /\.norm\.(glb|gltf)$/i,
    /\.packed\.packed\.(glb|gltf)$/i,
];

let removed = 0;

function rm(p) {
    try {
        fs.rmSync(p, { recursive: true, force: true });
        removed++;
        console.log("DEL  ", rel(repo, p));
    } catch { }
}

function removeNormWorkDirs(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name.endsWith(".norm_work")) {
                rm(p);
                continue; // no descender a directorios borrados
            }
            removeNormWorkDirs(p);
        }
    }
}

for (const root of roots) {
    removeNormWorkDirs(root);
    for (const f of walk(root)) {
        if (FILE_TRASH.some((rx) => rx.test(f))) rm(f);
    }
}

console.log(`Cleanup done. Items removed: ${removed}`);

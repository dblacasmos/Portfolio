#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { walk, findExistingRoots, rel } from "./lib/fs-utils.mjs";
import cfg from "./config.vram.mjs";

const repo = process.cwd();
const roots = findExistingRoots(cfg.modelDirs.map((p) => path.join(repo, p)));

const FILE_TRASH = [
    /\.tmp\d+\.(glb|gltf)$/i,           // ...*.tmp123.glb/gltf
    /\.norm\.(glb|gltf)$/i,             // ...*.norm.glb/gltf
    /\.packed\.packed\.(glb|gltf)$/i,   // ...*.packed.packed.glb/gltf
];

let removed = 0;

function rm(p) {
    try {
        fs.rmSync(p, { recursive: true, force: true });
        removed++;
        console.log("DEL  ", rel(repo, p));
    } catch { }
}

// 1) Borrar carpetas *.norm_work (en cualquier nivel) SIN descender a ellas
function removeNormWorkDirs(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name.endsWith(".norm_work")) {
                rm(p);              // borra la carpeta completa
                continue;           // no descender
            }
            removeNormWorkDirs(p); // buscar más profundo
        }
    }
}

// 2) Limpiar archivos basura
for (const root of roots) {
    removeNormWorkDirs(root);
    for (const f of walk(root)) {
        if (FILE_TRASH.some((rx) => rx.test(f))) rm(f);
    }
}

console.log(`Cleanup done. Items removed: ${removed}`);

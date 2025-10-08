// =============================
// FILE: scripts/tile-city.mjs
// =============================
//
// Grid-tiling para escenas grandes + manifest para streaming.
//
// Uso (dos estilos):
//   A) Posicional (recomendado en Windows):
//      npm run models:tile -- 4x4 "public/assets/models/CyberpunkCity.glb" "public/assets/models/tiles/"
//   B) Con flags (usa "=" para que npm no los trate como config):
//      npm run models:tile -- --grid=4x4 --input="public/assets/models/CyberpunkCity.glb" --out="public/assets/models/tiles/" [--name-prefix=Tile_]
//
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";
import { mat4, vec3, quat } from "gl-matrix";

/** Parseo robusto: admite flags (--grid/--input/--out) y modo posicional (<grid> <input> <out>) */
function parseArgs() {
    const args = process.argv.slice(2);
    const out = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--grid" || a.startsWith("--grid=")) {
            out.grid = a.includes("=") ? a.split("=")[1] : args[++i];
        } else if (a === "--input" || a.startsWith("--input=")) {
            out.input = a.includes("=") ? a.split("=")[1] : args[++i];
        } else if (a === "--out" || a.startsWith("--out=")) {
            out.out = a.includes("=") ? a.split("=")[1] : args[++i];
        } else if (a === "--name-prefix" || a.startsWith("--name-prefix=")) {
            out.namePrefix = a.includes("=") ? a.split("=")[1] : args[++i];
        }
    }
    if ((!out.grid || !out.input || !out.out) && args.length >= 3) {
        out.grid = out.grid || args[0];
        out.input = out.input || args[1];
        out.out = out.out || args[2];
    }
    if (!out.grid || !out.input || !out.out) {
        console.error("Usage:");
        console.error("  node scripts/tile-city.mjs --grid 4x4 --input path/to/city.glb --out out/dir [--name-prefix Tile_]");
        console.error("  node scripts/tile-city.mjs 4x4 path/to/city.glb out/dir");
        process.exit(1);
    }
    const m = /^([0-9]+)x([0-9]+)$/i.exec(String(out.grid));
    if (!m) {
        console.error("Invalid grid, expected WxH (e.g. 4x4)");
        process.exit(1);
    }
    out.namePrefix = out.namePrefix || "Tile_";
    return out;
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function isIdentity(m) {
    return m && m.length === 16 &&
        m[0] === 1 && m[5] === 1 && m[10] === 1 && m[15] === 1 &&
        m[1] === 0 && m[2] === 0 && m[3] === 0 && m[4] === 0 &&
        m[6] === 0 && m[7] === 0 && m[8] === 0 && m[9] === 0 &&
        m[11] === 0 && m[12] === 0 && m[13] === 0 && m[14] === 0;
}

function localMatrix(node) {
    const m = node.getMatrix?.();
    if (m && m.length === 16 && !isIdentity(m)) return Float32Array.from(m);
    const t = node.getTranslation?.();
    const r = node.getRotation?.();
    const s = node.getScale?.();
    const M = mat4.create();
    mat4.fromRotationTranslationScale(
        M,
        r ? Float32Array.from(r) : quat.create(),
        t ? Float32Array.from(t) : vec3.create(),
        s ? Float32Array.from(s) : vec3.fromValues(1, 1, 1)
    );
    return M;
}

function computeWorld(node, parentWorld, worldMap) {
    const M = mat4.create();
    mat4.multiply(M, parentWorld, localMatrix(node));
    worldMap.set(node, M);
    for (const child of node.listChildren()) computeWorld(child, M, worldMap);
}

function getNodeAABB(node, worldMap) {
    let min = vec3.fromValues(Infinity, Infinity, Infinity);
    let max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    let found = false;

    function expandByTransformed(minLocal, maxLocal, M) {
        const corners = [
            [minLocal[0], minLocal[1], minLocal[2]],
            [minLocal[0], minLocal[1], maxLocal[2]],
            [minLocal[0], maxLocal[1], minLocal[2]],
            [minLocal[0], maxLocal[1], maxLocal[2]],
            [maxLocal[0], minLocal[1], minLocal[2]],
            [maxLocal[0], minLocal[1], maxLocal[2]],
            [maxLocal[0], maxLocal[1], minLocal[2]],
            [maxLocal[0], maxLocal[1], maxLocal[2]],
        ];
        for (const c of corners) {
            const v = vec3.transformMat4(vec3.create(), vec3.fromValues(c[0], c[1], c[2]), M);
            min[0] = Math.min(min[0], v[0]); min[1] = Math.min(min[1], v[1]); min[2] = Math.min(min[2], v[2]);
            max[0] = Math.max(max[0], v[0]); max[1] = Math.max(max[1], v[1]); max[2] = Math.max(max[2], v[2]);
        }
    }

    function walkNode(n) {
        const mesh = n.getMesh?.();
        if (mesh) {
            const M = worldMap.get(n) || mat4.create();
            for (const prim of mesh.listPrimitives()) {
                const pos = prim.getAttribute?.("POSITION");
                if (pos) {
                    let minLocal = pos.getMin ? pos.getMin() : null;
                    let maxLocal = pos.getMax ? pos.getMax() : null;
                    if (!minLocal || !maxLocal) {
                        if (pos.getMinNormalized) minLocal = pos.getMinNormalized();
                        if (pos.getMaxNormalized) maxLocal = pos.getMaxNormalized();
                    }
                    if (minLocal && maxLocal) { expandByTransformed(minLocal, maxLocal, M); found = true; }
                }
            }
        }
        for (const c of n.listChildren()) walkNode(c);
    }

    walkNode(node);

    if (!found) {
        const M = worldMap.get(node) || mat4.create();
        const p = vec3.fromValues(M[12], M[13], M[14]);
        min = vec3.clone(p); max = vec3.clone(p);
    }
    return { min, max };
}

function centerRadiusFromAABB(min, max) {
    const c = vec3.fromValues((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    const dx = max[0] - min[0], dy = max[1] - min[1], dz = max[2] - min[2];
    const r = 0.5 * Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { center: c, radius: r };
}

async function main() {
    const opts = parseArgs();
    const io = new NodeIO();
    const doc = await io.read(opts.input); // ← importante: await
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];

    if (!scene) {
        console.error("No scene found in input:", opts.input);
        process.exit(1);
    }

    // Matrices de mundo
    const world = new Map();
    for (const root of scene.listChildren()) computeWorld(root, mat4.create(), world);

    // Usamos hijos raíz como “grupos”
    const groups = scene.listChildren();
    const tiles = [];
    let minXZ = [Infinity, Infinity], maxXZ = [-Infinity, -Infinity];

    for (const g of groups) {
        const { min, max } = getNodeAABB(g, world);
        const { center, radius } = centerRadiusFromAABB(min, max);
        tiles.push({
            name: g.getName() || "",
            center: [center[0], center[1], center[2]],
            radius,
            aabb: { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] }
        });
        minXZ[0] = Math.min(minXZ[0], min[0]); minXZ[1] = Math.min(minXZ[1], min[2]);
        maxXZ[0] = Math.max(maxXZ[0], max[0]); maxXZ[1] = Math.max(maxXZ[1], max[2]);
    }

    const [cols, rows] = String(opts.grid).split("x").map(Number);
    const sizeX = (maxXZ[0] - minXZ[0]) / cols;
    const sizeZ = (maxXZ[1] - minXZ[1]) / rows;

    const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ nodes: [] })));
    function cellIndex(x, z) {
        const cx = Math.min(cols - 1, Math.max(0, Math.floor((x - minXZ[0]) / Math.max(1e-6, sizeX))));
        const cz = Math.min(rows - 1, Math.max(0, Math.floor((z - minXZ[1]) / Math.max(1e-6, sizeZ))));
        return { cx, cz };
    }
    for (const t of tiles) {
        const { cx, cz } = cellIndex(t.center[0], t.center[2]);
        cells[cz][cx].nodes.push(t.name);
    }

    ensureDir(opts.out);
    const manifest = {
        grid: [cols, rows],
        input: path.relative(process.cwd(), opts.input).replace(/\\+/g, "/"),
        tiles: []
    };

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const keep = new Set(cells[r][c].nodes.filter(Boolean));
            if (!keep.size) continue;

            const outName = `${(opts.namePrefix || "Tile_")}${r}_${c}.glb`;
            const outPath = path.join(opts.out, outName);

            // Leer de cero cada vez para no arrastrar mutaciones
            const d = await io.read(opts.input);
            const sc = d.getRoot().getDefaultScene() || d.getRoot().listScenes()[0];

            for (const child of sc.listChildren()) {
                const nm = child.getName() || "";
                if (!keep.has(nm)) child.dispose();
            }

            await d.transform(prune(), dedup());
            await io.write(outPath, d);

            manifest.tiles.push({
                row: r,
                col: c,
                file: path.relative(process.cwd(), outPath).replace(/\\+/g, "/"),
                keep: Array.from(keep)
            });

            console.log(`TILE ${r}x${c} -> ${outPath} (${keep.size} groups)`);
        }
    }

    const manPath = path.join(opts.out, "tiles.manifest.json");
    fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest -> ${manPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

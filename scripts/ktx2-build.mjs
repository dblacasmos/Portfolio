#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";

const ROOTS = {
    textures: "public/assets/textures",
    ui: "public/assets/ui"
};

const modeArg = process.argv[2]; // textures | ui | undefined => all
const roots = modeArg ? [ROOTS[modeArg]] : Object.values(ROOTS);
const exts = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

function walk(dir, out = []) {
    for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        const s = statSync(p);
        if (s.isDirectory()) walk(p, out);
        else if (exts.has(extname(p).toLowerCase())) out.push(p);
    }
    return out;
}

function toktx(args) {
    try {
        execSync(`toktx ${args}`, { stdio: "inherit" });
    } catch (e) {
        console.error("Error ejecutando toktx:", e?.message ?? e);
        process.exit(1);
    }
}

for (const root of roots) {
    if (!existsSync(root)) continue;
    const files = walk(root);
    for (const f of files) {
        const out = join(dirname(f), basename(f, extname(f)) + ".ktx2");
        const isUI = root.includes("/ui");
        // ► UASTC para UI y alfa nítida (mejor calidad visual)
        // ► ETC1S para fondos grandes (mejor compresión)
        const common = `--t2 --force-orientation --assign_oetf sRGB --genmipmap`;
        if (isUI) {
            toktx(`${common} --uastc 2 --uastc_level 2 --zcmp 18 "${out}" "${f}"`);
        } else {
            toktx(`${common} --bcmp --encode etc1s --qlevel 128 "${out}" "${f}"`);
        }
    }
}

console.log("KTX2 listo. Asegúrate de haber llamado a initKTX2Loader(renderer).");

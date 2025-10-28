import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const SRC = resolve('src');
const graph = new Map();

const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.cts', '.json'];
const files = [];
(function walk(d) {
    for (const f of readdirSync(d)) {
        const p = join(d, f);
        const s = statSync(p);
        if (s.isDirectory()) walk(p);
        else if (/\.(t|j)sx?$|\.mjs$|\.mts$|\.cjs$|\.cts$/.test(f)) files.push(p);
    }
})(SRC);

function resolveLocal(from, spec) {
    if (!(spec.startsWith('.') || spec.startsWith('@/'))) return null;
    let base = dirname(from);
    let target = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : join(base, spec);
    const candidates = [target, ...exts.map(e => target + e), ...['index.ts', 'index.tsx', 'index.js', 'index.jsx'].map(i => join(target, i))];
    for (const c of candidates) { try { readFileSync(c); return c; } catch { } }
    return null;
}

for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const imports = [...src.matchAll(/import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g)].map(m => m[1]);
    graph.set(f, new Set());
    for (const spec of imports) {
        const r = resolveLocal(f, spec);
        if (r) graph.get(f).add(r);
    }
}

const cycles = [];
function dfs(u, path, seen) {
    seen.add(u); path.push(u);
    for (const v of (graph.get(u) || [])) {
        if (path.includes(v)) cycles.push([...path.slice(path.indexOf(v)), v]);
        else if (!seen.has(v)) dfs(v, path.slice(), new Set(seen));
    }
}
for (const n of graph.keys()) dfs(n, [], new Set());

if (cycles.length) {
    console.error('CYCLES FOUND:');
    for (const c of cycles) console.error('  - ' + c.join(' -> '));
    process.exit(1);
} else {
    console.log('No cycles in src/');
}

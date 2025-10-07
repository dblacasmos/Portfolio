// scripts/lib/fs-utils.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

export function findExistingRoots(roots) {
  return roots.filter((p) => fs.existsSync(p));
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function hashFile(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash("md5").update(buf).digest("hex");
}

export function rel(root, p) {
  return path.relative(root, p).replace(/\\/g, "/");
}

export function binExists(binName) {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    require("child_process").execSync(`${which} ${binName}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

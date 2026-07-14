import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

const VERSION_FILE = join(REPO_ROOT, "version.js");

export function readVersion() {
  const content = readFileSync(VERSION_FILE, "utf-8");
  const match = content.match(/VERSION\s*=\s*["']([^"']+)["']/);
  if (!match) throw new Error("version.js 中未找到 VERSION");
  return match[1];
}

export function writeVersion(version) {
  writeFileSync(VERSION_FILE, `export const VERSION = "${version}";\n`, "utf-8");

  const pkgPath = join(REPO_ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");

  const lockPath = join(REPO_ROOT, "package-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf-8"));
  lock.version = version;
  if (lock.packages?.[""]) lock.packages[""].version = version;
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf-8");
}

/** 将 version.js 同步到 package.json（打包前调用） */
export function syncPackageVersion() {
  const version = readVersion();
  const pkgPath = join(REPO_ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  if (pkg.version === version) return version;
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  return version;
}

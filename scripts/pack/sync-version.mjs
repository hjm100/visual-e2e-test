#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

const version = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8")).version;

const tauriConfPath = join(REPO_ROOT, "src-tauri/tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
if (tauriConf.version !== version) {
  tauriConf.version = version;
  writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);
}

const cargoPath = join(REPO_ROOT, "src-tauri/Cargo.toml");
let cargo = readFileSync(cargoPath, "utf-8");
const next = cargo.replace(/^version = ".*"$/m, `version = "${version}"`);
if (next !== cargo) writeFileSync(cargoPath, next);

console.log(`版本已同步: ${version}`);

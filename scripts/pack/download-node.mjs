#!/usr/bin/env node
/**
 * Download official Node.js binary into src-tauri/resources/node for sidecar packaging.
 */
import { createWriteStream, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { currentNodePlatform } from "./platform.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NODE_VERSION = process.env.NODE_SIDEcar_VERSION ?? "22.14.0";
const outRoot = join(__dirname, "../../src-tauri/resources/node");

const PLATFORMS = {
  "darwin-arm64": {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    bin: "bin/node",
  },
  "darwin-x64": {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    bin: "bin/node",
  },
  "win32-x64": {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    bin: "node.exe",
  },
};

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  await pipeline(res.body, createWriteStream(dest));
}

function extractTar(tarPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  execSync(`tar -xzf "${tarPath}" -C "${destDir}"`, { stdio: "inherit" });
}

function extractZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  execSync(`unzip -q -o "${zipPath}" -d "${destDir}"`, { stdio: "inherit" });
}

function findExtractedRoot(dir) {
  const entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (entries.length === 1) return join(dir, entries[0].name);
  throw new Error(`Unexpected extract layout in ${dir}`);
}

function platformReady(platformDir, spec) {
  const marker = join(platformDir, spec.bin);
  if (!existsSync(marker)) return false;

  if (spec.bin === "bin/node") {
    const binDir = join(platformDir, "bin");
    if (!existsSync(binDir)) return false;
    const entries = readdirSync(binDir);
    if (entries.length !== 1 || entries[0] !== "node") return false;
  }

  return true;
}

function copyNodeBinary(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  if (process.platform !== "win32") {
    execSync(`chmod +x "${dest}"`);
  }
}

async function fetchPlatform(key, spec) {
  const platformDir = join(outRoot, key);
  if (platformReady(platformDir, spec)) {
    console.log(`Node ${key} already present, skip`);
    return;
  }

  if (existsSync(platformDir)) rmSync(platformDir, { recursive: true, force: true });
  mkdirSync(platformDir, { recursive: true });

  const archive = join(platformDir, key.endsWith("win32-x64") ? "node.zip" : "node.tar.gz");
  console.log(`Downloading Node ${NODE_VERSION} for ${key}...`);
  await download(spec.url, archive);

  const tmp = join(platformDir, "_extract");
  if (key.endsWith("win32-x64")) extractZip(archive, tmp);
  else extractTar(archive, tmp);

  const extracted = findExtractedRoot(tmp);

  if (key.endsWith("win32-x64")) {
    copyNodeBinary(join(extracted, "node.exe"), join(platformDir, "node.exe"));
  } else {
    copyNodeBinary(join(extracted, "bin", "node"), join(platformDir, "bin", "node"));
  }

  rmSync(join(platformDir, "_extract"), { recursive: true, force: true });
  rmSync(archive, { force: true });

  const marker = join(platformDir, spec.bin);
  if (!existsSync(marker)) throw new Error(`Node binary missing after extract: ${marker}`);
  console.log(`Node ${key} ready at ${marker}`);
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const onlyArg = args.find((a) => a !== "--all");

  let targets;
  if (all) {
    targets = PLATFORMS;
  } else if (onlyArg) {
    targets = { [onlyArg]: PLATFORMS[onlyArg] };
  } else {
    const current = currentNodePlatform();
    targets = { [current]: PLATFORMS[current] };
    console.log(`Downloading Node for current platform: ${current}`);
  }

  if (Object.values(targets).some((v) => !v)) {
    console.error(`Unknown platform: ${onlyArg}`);
    console.error(`Available: ${Object.keys(PLATFORMS).join(", ")}`);
    process.exit(1);
  }

  mkdirSync(outRoot, { recursive: true });
  for (const [key, spec] of Object.entries(targets)) {
    await fetchPlatform(key, spec);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

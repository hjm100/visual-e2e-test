#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";
import { copyBundlesToBuild } from "./copy-bundles.mjs";
import { buildOutputSubdir, currentNodePlatform } from "./platform.mjs";
import "./sync-version.mjs";

process.env.CARGO_TARGET_DIR = join(REPO_ROOT, "src-tauri", "target");

const WINDOWS_TARGET = "x86_64-pc-windows-msvc";
const VALID_TARGETS = new Set(["mac", "win", "all"]);

function parseTarget() {
  const arg = process.argv[2] ?? "mac";
  if (!VALID_TARGETS.has(arg)) {
    console.error(`未知打包目标: ${arg}`);
    console.error("用法: node scripts/pack/run-tauri-build.mjs [mac|win|all]");
    console.error("  mac  macOS 安装包 → build/macos/");
    console.error("  win  Windows 安装包 → build/windows/");
    console.error("  all  mac + win（macOS 上 win 为交叉编译）");
    process.exit(1);
  }
  return arg;
}

function cleanBuildOutput(target) {
  if (target === "all") {
    rmSync(join(REPO_ROOT, "build"), { recursive: true, force: true });
    console.log("已清空 build/");
    return;
  }

  const nodePlatform = target === "mac" ? currentNodePlatform() : "win32-x64";
  const subdir = buildOutputSubdir(nodePlatform);
  const outDir = join(REPO_ROOT, "build", subdir);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(REPO_ROOT, "build"), { recursive: true });
  console.log(`已清空 build/${subdir}/`);
}

function cleanStaleBundleResources(rustTarget) {
  const base = rustTarget
    ? join(process.env.CARGO_TARGET_DIR, rustTarget, "release/resources")
    : join(process.env.CARGO_TARGET_DIR, "release/resources");
  rmSync(base, { recursive: true, force: true });
}

function ensureCargoPath() {
  const cargoBin = join(homedir(), ".cargo", "bin");
  const parts = (process.env.PATH ?? "").split(":");
  if (!parts.includes(cargoBin)) {
    process.env.PATH = `${cargoBin}:${process.env.PATH ?? ""}`;
  }
}

function preflightCargo() {
  ensureCargoPath();
  const check = spawnSync("cargo", ["--version"], { encoding: "utf8" });
  if (check.status === 0) return;

  console.error("未找到 cargo（Rust 工具链未安装或未加入 PATH）。");
  console.error("  npm run setup:rust && source ~/.cargo/env");
  process.exit(1);
}

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${label}`);
    const child = spawn(cmd, args, { cwd: REPO_ROOT, stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${label} killed: ${signal}`));
      else resolve(code ?? 1);
    });
  });
}

function ensureWindowsCrossToolchain() {
  const targetList = spawnSync("rustup", ["target", "list", "--installed"], { encoding: "utf8" });
  if (!targetList.stdout.includes(WINDOWS_TARGET)) {
    console.log(`安装 Rust target: ${WINDOWS_TARGET}`);
    const add = spawnSync("rustup", ["target", "add", WINDOWS_TARGET], { stdio: "inherit" });
    if (add.status !== 0) process.exit(add.status ?? 1);
  }

  const xwin = spawnSync("cargo-xwin", ["--version"], { encoding: "utf8" });
  if (xwin.status !== 0) {
    console.error("Windows 交叉编译需要 cargo-xwin:");
    console.error("  cargo install cargo-xwin");
    process.exit(1);
  }
}

function macStep() {
  if (process.platform !== "darwin") {
    console.error("macOS 安装包只能在 macOS 上构建");
    process.exit(1);
  }
  return {
    label: "macOS 安装包",
    tauriArgs: [],
    nodePlatform: currentNodePlatform(),
  };
}

function winStep() {
  if (process.platform === "darwin") {
    return {
      label: "Windows 安装包（交叉编译）",
      tauriArgs: ["--target", WINDOWS_TARGET, "--runner", "cargo-xwin"],
      nodePlatform: "win32-x64",
      rustTarget: WINDOWS_TARGET,
    };
  }
  if (process.platform === "win32") {
    return {
      label: "Windows 安装包",
      tauriArgs: [],
      nodePlatform: "win32-x64",
    };
  }
  console.error(`不支持在此系统打包 Windows: ${process.platform}`);
  process.exit(1);
}

/** @returns {Array<{ label: string; tauriArgs: string[]; nodePlatform: string; rustTarget?: string }>} */
function buildPlan(target) {
  if (target === "mac") return [macStep()];
  if (target === "win") return [winStep()];
  if (target === "all") {
    if (process.platform === "darwin") return [macStep(), winStep()];
    if (process.platform === "win32") return [winStep()];
    console.error(`不支持在此系统打包 all: ${process.platform}`);
    process.exit(1);
  }
  return [];
}

async function downloadNodeSidecars(target) {
  const args =
    target === "all"
      ? ["scripts/pack/download-node.mjs", "--all"]
      : target === "mac"
        ? ["scripts/pack/download-node.mjs", currentNodePlatform()]
        : ["scripts/pack/download-node.mjs", "win32-x64"];

  const label = target === "all" ? "download-node --all" : `download-node ${args[2]}`;
  if ((await run("node", args, label)) !== 0) process.exit(1);
}

const target = parseTarget();
const plan = buildPlan(target);

preflightCargo();
cleanBuildOutput(target);

await downloadNodeSidecars(target);

if (plan.some((s) => s.rustTarget)) {
  ensureWindowsCrossToolchain();
}

const results = [];

for (const step of plan) {
  cleanStaleBundleResources(step.rustTarget);
  const code = await run("npx", ["tauri", "build", ...step.tauriArgs], step.label);
  if (code !== 0) process.exit(code);

  const { subdir, copied } = copyBundlesToBuild(REPO_ROOT, step.nodePlatform, step.rustTarget);
  results.push({ subdir, copied });
}

console.log("\n安装包已输出到 build/");
for (const { subdir, copied } of results) {
  console.log(`  build/${subdir}/`);
  for (const name of copied) console.log(`    ${name}`);
}

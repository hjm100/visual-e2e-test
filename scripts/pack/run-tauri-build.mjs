#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

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
  console.error("");
  console.error("  npm run setup:rust");
  console.error("  source ~/.cargo/env    # 或重启终端");
  console.error("");
  console.error("然后重新运行: npm run tauri:build");
  process.exit(1);
}

preflightCargo();

const child = spawn("npx", ["tauri", "build"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

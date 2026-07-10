#!/usr/bin/env node
import { spawn } from "node:child_process";
import { applyTauriDevWebEnv, REPO_ROOT } from "./env.mjs";
import { preflightTauriDev } from "./preflight.mjs";

await preflightTauriDev();
applyTauriDevWebEnv();

const child = spawn("npx", ["tauri", "dev"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

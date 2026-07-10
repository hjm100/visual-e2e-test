#!/usr/bin/env node
/** Vite for tauri dev — proxy /api to client sidecar on :3100 */
import { spawn } from "node:child_process";
import { applyTauriDevWebEnv, REPO_ROOT } from "./env.mjs";

applyTauriDevWebEnv();

const child = spawn("npm", ["run", "dev", "--prefix", "workspace/web"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

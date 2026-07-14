#!/usr/bin/env node
import { spawn } from "node:child_process";
import { applyWorkspaceEnv, REPO_ROOT } from "./env.mjs";
import { preflightWorkspace } from "./preflight.mjs";

applyWorkspaceEnv();
await preflightWorkspace();

const child = spawn("npm", ["run", "dev", "--prefix", "workspace/server"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

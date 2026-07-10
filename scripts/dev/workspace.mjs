#!/usr/bin/env node
import { spawn } from "node:child_process";
import { applyWorkspaceEnv, REPO_ROOT } from "./env.mjs";
import { preflightWorkspace } from "./preflight.mjs";

applyWorkspaceEnv();
await preflightWorkspace();

const children = [
  spawn("node", ["scripts/dev/workspace-server.mjs"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  }),
  spawn("node", ["scripts/dev/workspace-web.mjs"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  }),
];

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

children[0].on("exit", (code) => {
  if (code && code !== 0) shutdown("SIGTERM");
});
children[1].on("exit", (code) => {
  if (code && code !== 0) shutdown("SIGTERM");
});

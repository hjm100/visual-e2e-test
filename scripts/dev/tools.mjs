#!/usr/bin/env node
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { discoverTools } from "../tools/discover.mjs";
import { REPO_ROOT } from "./env.mjs";

const filter = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const tools = discoverTools().filter((t) => filter.length === 0 || filter.includes(t.id));

if (tools.length === 0) {
  console.error(filter.length > 0 ? `未找到工具: ${filter.join(", ")}` : "registry 中无工具");
  process.exit(1);
}

function clientStorageRoot() {
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "visual-e2e-test", "Storage");
  }
  if (process.platform === "win32") {
    const appdata = process.env.APPDATA;
    if (appdata) return join(appdata, "visual-e2e-test", "Storage");
  }
  return join(homedir(), ".local", "share", "visual-e2e-test", "Storage");
}

const storageRoot = clientStorageRoot();

const sharedRuntimeEnv = {
  E2E_ROOT: process.env.E2E_ROOT ?? REPO_ROOT,
  PROJECTS_DIR: process.env.PROJECTS_DIR ?? join(storageRoot, "projects"),
  CONFIG_DIR: process.env.CONFIG_DIR ?? join(storageRoot, "config"),
  E2E_RUNTIME: process.env.E2E_RUNTIME ?? "client",
};

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

for (const tool of tools) {
  console.log(`启动工具: ${tool.id} (api:${tool.devPort}, web:${tool.webDevPort})`);
  const child = spawn("npm", ["run", "dev"], {
    cwd: tool.path,
    stdio: "inherit",
    env: {
      ...process.env,
      ...sharedRuntimeEnv,
      TOOL_ID: tool.id,
      TOOL_PORT: String(tool.devPort),
      TOOL_WEB_PORT: String(tool.webDevPort),
    },
  });
  children.push(child);
}

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

children[0]?.on("exit", (code) => {
  if (code && code !== 0) shutdown("SIGTERM");
});

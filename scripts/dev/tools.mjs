#!/usr/bin/env node
import { spawn } from "node:child_process";
import { discoverTools } from "../tools/discover.mjs";

const filter = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const tools = discoverTools().filter((t) => filter.length === 0 || filter.includes(t.id));

if (tools.length === 0) {
  console.error(filter.length > 0 ? `未找到工具: ${filter.join(", ")}` : "registry 中无工具");
  process.exit(1);
}

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

for (const tool of tools) {
  console.log(`启动工具: ${tool.id} (api:${tool.devPort}, web:${tool.webDevPort})`);
  const child = spawn("npm", ["run", "dev"], {
    cwd: tool.path,
    stdio: "inherit",
    env: {
      ...process.env,
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

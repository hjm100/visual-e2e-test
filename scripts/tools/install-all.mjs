#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { discoverTools } from "./discover.mjs";

const tools = discoverTools();
if (tools.length === 0) {
  console.log("无工具需要安装");
  process.exit(0);
}

for (const tool of tools) {
  console.log(`\n==> npm install: ${tool.id}`);
  const result = spawnSync("npm", ["install"], {
    cwd: tool.path,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\n已安装 ${tools.length} 个工具`);

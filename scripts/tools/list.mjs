#!/usr/bin/env node
import { discoverTools } from "./discover.mjs";

const tools = discoverTools();
if (tools.length === 0) {
  console.log("（无已注册工具）");
  process.exit(0);
}

for (const tool of tools) {
  console.log(
    `${tool.id}\t${tool.name}\tapi:${tool.devPort}\tweb:${tool.webDevPort}\tprod:${tool.prodPort}`,
  );
}

#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

/**
 * @returns {Array<{
 *   id: string;
 *   name: string;
 *   description?: string;
 *   entry: string;
 *   icon?: string;
 *   category?: string;
 *   devPort: number;
 *   prodPort: number;
 *   webDevPort: number;
 *   path: string;
 * }>}
 */
export function discoverTools() {
  const registryPath = join(REPO_ROOT, "tools", "registry.json");
  if (!existsSync(registryPath)) {
    throw new Error(`缺少 tools/registry.json: ${registryPath}`);
  }

  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  const tools = registry.tools ?? [];
  const seenPorts = new Set();
  const result = [];

  for (const tool of tools) {
    const entry = tool.entry ?? tool.id;
    const toolPath = join(REPO_ROOT, "tools", entry);
    const pkgPath = join(toolPath, "package.json");

    if (!existsSync(pkgPath)) {
      throw new Error(`工具 ${tool.id} 缺少 package.json: ${pkgPath}`);
    }

    const devPort = tool.devPort;
    const prodPort = tool.prodPort;
    const webDevPort = tool.webDevPort;

    for (const port of [devPort, prodPort, webDevPort]) {
      if (port == null) continue;
      if (seenPorts.has(port)) {
        throw new Error(`端口 ${port} 重复，请检查 tools/registry.json`);
      }
      seenPorts.add(port);
    }

    result.push({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      entry,
      icon: tool.icon,
      category: tool.category,
      devPort,
      prodPort,
      webDevPort,
      path: toolPath,
    });
  }

  return result;
}

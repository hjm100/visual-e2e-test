import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

export interface ToolRegistryEntry {
  id: string;
  name: string;
  description?: string;
  entry: string;
  icon?: string;
  category?: string;
  devPort: number;
  prodPort: number;
  webDevPort: number;
}

export function loadToolRegistry(e2eRoot: string): ToolRegistryEntry[] {
  const registryPath = join(e2eRoot, "tools", "registry.json");
  if (!existsSync(registryPath)) return [];
  const raw = JSON.parse(readFileSync(registryPath, "utf-8")) as {
    tools?: ToolRegistryEntry[];
  };
  return raw.tools ?? [];
}

export function registerToolsRegistryRoutes(app: FastifyInstance, e2eRoot: string): void {
  app.get("/api/tools/registry", async () => ({
    version: 1,
    tools: loadToolRegistry(e2eRoot),
  }));
}

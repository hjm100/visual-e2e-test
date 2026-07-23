import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { resolveStorageLayout } from "../storage.js";

export interface ToolRegistryEntry {
  id: string;
  entry: string;
  devPort: number;
  prodPort: number;
}

interface RunningTool {
  child: ChildProcess;
  port: number;
}

const running = new Map<string, RunningTool>();

function loadRegistry(appRoot: string): ToolRegistryEntry[] {
  const registryPath = join(appRoot, "tools", "registry.json");
  if (!existsSync(registryPath)) return [];
  const raw = JSON.parse(readFileSync(registryPath, "utf-8")) as {
    tools?: ToolRegistryEntry[];
  };
  return raw.tools ?? [];
}

async function waitForHealth(port: number, timeoutMs: number): Promise<void> {
  const url = `http://127.0.0.1:${port}/api/health`;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Tool server did not become ready at ${url}`);
}

async function isHealthy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function buildToolEnv(isDev: boolean, appRoot: string): NodeJS.ProcessEnv {
  const layout = resolveStorageLayout(isDev, app.getPath("userData"));
  return {
    ...process.env,
    E2E_ROOT: process.env.E2E_ROOT?.trim() || appRoot,
    PROJECTS_DIR: process.env.PROJECTS_DIR?.trim() || layout.projectsDir,
    CONFIG_DIR: process.env.CONFIG_DIR?.trim() || layout.configDir,
    E2E_RUNTIME: process.env.E2E_RUNTIME?.trim() || "client",
  };
}

export async function ensureToolRunning(
  toolId: string,
  isDev: boolean,
  appRoot: string,
  nodeBinary: string,
): Promise<number> {
  const existing = running.get(toolId);
  if (existing) return existing.port;

  const tool = loadRegistry(appRoot).find((t) => t.id === toolId);
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);

  const port = isDev ? tool.devPort : tool.prodPort;

  if (await isHealthy(port)) {
    return port;
  }

  const toolDir = join(appRoot, "tools", tool.entry);
  const entry = join(toolDir, "server", "dist", "index.js");

  if (!existsSync(entry)) {
    throw new Error(`Tool server missing: ${entry}. Run: npm run tools:build`);
  }

  const child = spawn(nodeBinary, [entry], {
    cwd: toolDir,
    env: {
      ...buildToolEnv(isDev, appRoot),
      TOOL_ID: tool.id,
      TOOL_PORT: String(port),
      NODE_ENV: isDev ? "development" : "production",
      SERVE_WEB: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk: Buffer) => process.stdout.write(`[tool:${toolId}] ${chunk}`));
  child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(`[tool:${toolId}] ${chunk}`));

  running.set(toolId, { child, port });
  child.on("exit", () => {
    if (running.get(toolId)?.child === child) running.delete(toolId);
  });

  await waitForHealth(port, 30_000);
  return port;
}

export function stopAllTools(): void {
  for (const { child } of running.values()) {
    if (!child.killed) child.kill();
  }
  running.clear();
}

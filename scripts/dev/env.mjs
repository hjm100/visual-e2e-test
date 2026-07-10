import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(__dirname, "../..");

export const PORTS = {
  workspace: 3101,
  client: 3100,
};

const SCRUB_KEYS = [
  "BUNDLED_NODE",
  "E2E_ROOT",
  "PROJECTS_DIR",
  "CONFIG_DIR",
  "CLIENT_MODE",
  "SERVE_WEB",
  "E2E_RUNTIME",
  "WORKSPACE_PORT",
  "WORKSPACE_HOST",
  "VITE_API_URL",
];

/** Remove client / inherited runtime env so launch scripts own the contract. */
export function scrubRuntimeEnv() {
  for (const key of SCRUB_KEYS) {
    delete process.env[key];
  }
}

export function applyWorkspaceEnv() {
  scrubRuntimeEnv();
  process.env.E2E_RUNTIME = "workspace";
  process.env.WORKSPACE_PORT = String(PORTS.workspace);
  process.env.WORKSPACE_HOST = "0.0.0.0";
  process.env.VITE_API_URL = `http://127.0.0.1:${PORTS.workspace}`;
}

export function applyTauriDevWebEnv() {
  process.env.VITE_API_URL = `http://127.0.0.1:${PORTS.client}`;
}

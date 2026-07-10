import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getE2eRoot() {
  if (process.env.E2E_ROOT?.trim()) {
    return resolve(process.env.E2E_ROOT.trim());
  }
  return resolve(__dirname, "..");
}

export function getProjectsDir(e2eRoot = getE2eRoot()) {
  if (process.env.PROJECTS_DIR?.trim()) {
    return resolve(process.env.PROJECTS_DIR.trim());
  }
  return join(e2eRoot, "projects");
}

export function getConfigDir(e2eRoot = getE2eRoot()) {
  if (process.env.CONFIG_DIR?.trim()) {
    return resolve(process.env.CONFIG_DIR.trim());
  }
  return join(e2eRoot, "config");
}

export function getSettingsPath(e2eRoot = getE2eRoot()) {
  return join(getConfigDir(e2eRoot), "settings.json");
}

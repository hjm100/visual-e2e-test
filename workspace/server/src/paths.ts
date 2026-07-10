import { join, resolve } from "node:path";

export function resolveE2eRoot(defaultRoot: string): string {
  const fromEnv = process.env.E2E_ROOT?.trim();
  if (fromEnv) return resolve(fromEnv);
  return resolve(defaultRoot);
}

export function resolveProjectsDir(e2eRoot: string): string {
  const fromEnv = process.env.PROJECTS_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  return join(e2eRoot, "projects");
}

export function resolveConfigDir(e2eRoot: string): string {
  const fromEnv = process.env.CONFIG_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  return join(e2eRoot, "config");
}

export function resolveSettingsPath(e2eRoot: string): string {
  return join(resolveConfigDir(e2eRoot), "settings.json");
}

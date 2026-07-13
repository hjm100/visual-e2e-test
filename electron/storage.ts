import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { shell } from "electron";
import { devStorageRoot } from "./paths.js";

export interface StorageLayout {
  storageRoot: string;
  projectsDir: string;
  configDir: string;
}

function layoutFromRoot(storageRoot: string): StorageLayout {
  return {
    storageRoot,
    projectsDir: join(storageRoot, "projects"),
    configDir: join(storageRoot, "config"),
  };
}

export function resolveStorageLayout(isDev: boolean, userDataPath: string): StorageLayout {
  const storageRoot = isDev ? devStorageRoot() : join(userDataPath, "Storage");
  return layoutFromRoot(storageRoot);
}

export function ensureStorage(layout: StorageLayout, bundledAppRoot: string): void {
  mkdirSync(layout.projectsDir, { recursive: true });
  mkdirSync(layout.configDir, { recursive: true });

  const settingsPath = join(layout.configDir, "settings.json");
  if (!existsSync(settingsPath)) {
    const bundled = join(bundledAppRoot, "config", "settings.json");
    if (existsSync(bundled)) {
      copyFileSync(bundled, settingsPath);
    }
  }
}

export async function openStorageInFileManager(layout: StorageLayout): Promise<void> {
  const err = await shell.openPath(layout.storageRoot);
  if (err) throw new Error(err);
}

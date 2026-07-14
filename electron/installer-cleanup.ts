import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { StorageLayout } from "./storage.js";

const PRODUCT_NAME = "Visual E2E Test";
const CLEANUP_FLAG = "installer_cleanup.done";

export function cleanupIfNeeded(isDev: boolean, layout: StorageLayout): void {
  if (isDev || process.platform !== "darwin") return;

  mkdirSync(layout.configDir, { recursive: true });
  const flag = join(layout.configDir, CLEANUP_FLAG);
  if (existsSync(flag)) return;

  const home = homedir();
  const candidates: string[] = [];

  try {
    const output = execSync("hdiutil info", { encoding: "utf8" });
    for (const section of output.split("==============")) {
      if (!section.includes(PRODUCT_NAME)) continue;
      for (const line of section.split("\n")) {
        const trimmed = line.trim();
        const prefix = "image-path";
        if (trimmed.startsWith(prefix)) {
          const path = trimmed.slice(prefix.length).trim().replace(/^:/, "").trim();
          if (path.endsWith(".dmg")) candidates.push(path);
        }
      }
    }
  } catch {
    // ignore
  }

  for (const dir of [join(home, "Downloads"), join(home, "Desktop")]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.startsWith(PRODUCT_NAME) && name.endsWith(".dmg")) {
        candidates.push(join(dir, name));
      }
    }
  }

  const unique = [...new Set(candidates)].sort();
  for (const path of unique) {
    try {
      if (!existsSync(path)) continue;
      try {
        execSync(`hdiutil detach "${path}" -quiet`, { stdio: "ignore" });
      } catch {
        // ignore
      }
      rmSync(path, { force: true });
    } catch (err) {
      console.error(`installer cleanup: skip ${path} (${err})`);
    }
  }

  writeFileSync(flag, "1");
}

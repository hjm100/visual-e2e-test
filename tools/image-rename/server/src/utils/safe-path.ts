import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathSecurityError";
  }
}

export function resolveDir(dir: string): string {
  const abs = resolve(dir.trim());
  if (!existsSync(abs)) {
    throw new PathSecurityError(`目录不存在: ${abs}`);
  }
  if (!statSync(abs).isDirectory()) {
    throw new PathSecurityError(`不是目录: ${abs}`);
  }
  return abs;
}

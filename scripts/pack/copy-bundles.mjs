import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildOutputSubdir } from "./platform.mjs";

export function resolveBundleRoot(repoRoot, rustTarget) {
  const targetDir = process.env.CARGO_TARGET_DIR ?? join(repoRoot, "src-tauri/target");
  if (rustTarget) {
    return join(targetDir, rustTarget, "release/bundle");
  }
  return join(targetDir, "release/bundle");
}

function copyDirArtifacts(srcDir, outDir, ext, copied, recursive = false) {
  if (!existsSync(srcDir)) return;
  for (const name of readdirSync(srcDir)) {
    if (!name.endsWith(ext)) continue;
    cpSync(join(srcDir, name), join(outDir, name), { recursive });
    copied.push(name);
  }
}

/** Copy Tauri bundle artifacts into build/{macos|windows}/. */
export function copyBundlesToBuild(repoRoot, nodePlatform, rustTarget) {
  const targetDir = process.env.CARGO_TARGET_DIR ?? join(repoRoot, "src-tauri/target");
  const bundleRoot = resolveBundleRoot(repoRoot, rustTarget);

  const subdir = buildOutputSubdir(nodePlatform);
  const outDir = join(repoRoot, "build", subdir);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const copied = [];
  if (existsSync(bundleRoot)) {
    copyDirArtifacts(join(bundleRoot, "macos"), outDir, ".app", copied, true);
    copyDirArtifacts(join(bundleRoot, "dmg"), outDir, ".dmg", copied);
    copyDirArtifacts(join(bundleRoot, "msi"), outDir, ".msi", copied);
    copyDirArtifacts(join(bundleRoot, "nsis"), outDir, ".exe", copied);
  }

  // macOS 交叉编译 Windows 时可能只有 release/*.exe，无 NSIS 安装包
  if (copied.length === 0 && rustTarget) {
    const releaseDir = join(targetDir, rustTarget, "release");
    if (existsSync(releaseDir)) {
      for (const name of readdirSync(releaseDir)) {
        if (!name.endsWith(".exe")) continue;
        cpSync(join(releaseDir, name), join(outDir, name));
        copied.push(name);
      }
    }
  }

  if (copied.length === 0) {
    throw new Error(`未找到安装包产物（${bundleRoot}）`);
  }

  return { subdir, outDir, copied };
}

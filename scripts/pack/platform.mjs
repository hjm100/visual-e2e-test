/** Node sidecar / Tauri bundle platform keys. */
export const NODE_PLATFORMS = {
  "darwin-arm64": "macos",
  "darwin-x64": "macos",
  "win32-x64": "windows",
};

export function currentNodePlatform() {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  if (process.platform === "win32") {
    return "win32-x64";
  }
  throw new Error(`Unsupported build host: ${process.platform}/${process.arch}`);
}

export function buildOutputSubdir(nodePlatform = currentNodePlatform()) {
  const sub = NODE_PLATFORMS[nodePlatform];
  if (!sub) throw new Error(`Unknown node platform: ${nodePlatform}`);
  return sub;
}

/** True when running inside the Electron desktop client. */
export function isElectron(): boolean {
  return typeof window !== "undefined" && window.electronAPI?.isElectron === true;
}

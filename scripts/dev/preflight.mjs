import { PORTS } from "./env.mjs";

export async function fetchHealth(port, timeoutMs = 2000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function preflightWorkspace() {
  const health = await fetchHealth(PORTS.workspace);
  if (!health) return;

  if (health.runtime === "client" || health.e2eRoot?.includes(".app")) {
    console.error(
      `[workspace] Port ${PORTS.workspace} is serving client runtime (${health.e2eRoot}).`,
    );
    console.error("Quit Visual E2E Test.app or stop the process on this port, then retry.");
    process.exit(1);
  }

  console.warn(`[workspace] Port ${PORTS.workspace} already has a workspace server.`);
}

export async function preflightTauriDev() {
  const health = await fetchHealth(PORTS.client);
  if (!health) return;

  if (health.runtime === "workspace") {
    console.error(`[tauri:dev] Port ${PORTS.client} is workspace server. Stop npm run workspace first.`);
    process.exit(1);
  }

  if (health.e2eRoot?.includes(".app")) {
    console.error(
      `[tauri:dev] Port ${PORTS.client} is used by installed Visual E2E Test.app.`,
    );
    console.error("Quit the .app (⌘Q) before npm run tauri:dev.");
    process.exit(1);
  }
}

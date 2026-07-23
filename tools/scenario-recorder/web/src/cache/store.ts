export const TOOL_ID = "scenario-recorder";
export const CACHE_VERSION = 1;
export const CACHE_KEY = `vet-tool:${TOOL_ID}:v${CACHE_VERSION}`;

export interface RecorderCache {
  scenarioId: string;
  scenarioName: string;
  module: string;
  startUrl: string;
  requiresLogin: boolean;
  updatedAt: number;
}

const DEFAULT: RecorderCache = {
  scenarioId: "",
  scenarioName: "",
  module: "default",
  startUrl: "",
  requiresLogin: false,
  updatedAt: 0,
};

export function loadCache(): RecorderCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveCache(patch: Partial<RecorderCache>): RecorderCache {
  const next = { ...loadCache(), ...patch, updatedAt: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  return next;
}

export function clearCache(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(`vet-tool:${TOOL_ID}:`)) {
      localStorage.removeItem(key);
    }
  }
}

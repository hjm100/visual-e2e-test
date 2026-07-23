export const TOOL_ID = "scenario-recorder";
export const CACHE_VERSION = 2;

export interface RecorderCache {
  scenarioId: string;
  scenarioName: string;
  module: string;
  startUrl: string;
  requiresLogin: boolean;
  updatedAt: number;
}

export const FIXED_DEFAULTS: Omit<RecorderCache, "updatedAt"> = {
  scenarioId: "regression_testing",
  scenarioName: "回归测试",
  module: "regression",
  startUrl: "",
  requiresLogin: true,
};

function cacheKey(projectId: string): string {
  return `vet-tool:${TOOL_ID}:v${CACHE_VERSION}:${projectId || "_"}`;
}

export function loadCache(projectId: string): RecorderCache {
  const defaults: RecorderCache = { ...FIXED_DEFAULTS, updatedAt: 0 };
  try {
    const raw = localStorage.getItem(cacheKey(projectId));
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveCache(projectId: string, patch: Partial<RecorderCache>): RecorderCache {
  const next = { ...loadCache(projectId), ...patch, updatedAt: Date.now() };
  localStorage.setItem(cacheKey(projectId), JSON.stringify(next));
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

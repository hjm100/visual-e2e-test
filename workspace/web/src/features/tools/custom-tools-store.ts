export const CUSTOM_TOOLS_KEY = "vet-tool:hub:custom-tools:v1";

export interface CustomTool {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  url: string;
}

interface CustomToolsStore {
  version: number;
  tools: CustomTool[];
}

function readStore(): CustomToolsStore {
  try {
    const raw = localStorage.getItem(CUSTOM_TOOLS_KEY);
    if (!raw) return { version: 1, tools: [] };
    const parsed = JSON.parse(raw) as CustomToolsStore;
    return { version: 1, tools: parsed.tools ?? [] };
  } catch {
    return { version: 1, tools: [] };
  }
}

function writeStore(tools: CustomTool[]): CustomTool[] {
  localStorage.setItem(CUSTOM_TOOLS_KEY, JSON.stringify({ version: 1, tools }));
  return tools;
}

export function listCustomTools(): CustomTool[] {
  return readStore().tools;
}

export function getCustomTool(id: string): CustomTool | undefined {
  return readStore().tools.find((t) => t.id === id);
}

export function createCustomTool(
  input: Omit<CustomTool, "id">,
): CustomTool {
  const tool: CustomTool = {
    id: `custom-${crypto.randomUUID()}`,
    ...input,
  };
  const tools = [...readStore().tools, tool];
  writeStore(tools);
  return tool;
}

export function updateCustomTool(id: string, patch: Omit<CustomTool, "id">): CustomTool | null {
  const store = readStore();
  const index = store.tools.findIndex((t) => t.id === id);
  if (index < 0) return null;
  const updated: CustomTool = { id, ...patch };
  const tools = [...store.tools];
  tools[index] = updated;
  writeStore(tools);
  return updated;
}

export function deleteCustomTool(id: string): boolean {
  const store = readStore();
  const tools = store.tools.filter((t) => t.id !== id);
  if (tools.length === store.tools.length) return false;
  writeStore(tools);
  return true;
}

export function isCustomToolId(id: string): boolean {
  return id.startsWith("custom-");
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

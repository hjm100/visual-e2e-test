export interface ToolRegistryEntry {
  id: string;
  name: string;
  description?: string;
  entry: string;
  icon?: string;
  category?: string;
  devPort: number;
  prodPort: number;
  webDevPort: number;
}

export interface ToolRegistryResponse {
  version: number;
  tools: ToolRegistryEntry[];
}

/** postMessage types between host and tool iframe */
export const TOOL_MSG = {
  CACHE_CLEAR: "vet-tool:cache:clear",
  CACHE_CLEARED: "vet-tool:cache:cleared",
  PICK_FOLDER: "vet-tool:bridge:pick-folder",
  PICK_FOLDER_RESULT: "vet-tool:bridge:pick-folder-result",
  PROJECT_CONTEXT: "vet-tool:project:context",
  PROJECT_CONTEXT_REQUEST: "vet-tool:project:context:request",
  NAVIGATE_SCENARIO: "vet-tool:scenario:navigate",
} as const;

export interface ToolProjectContextMessage {
  type: typeof TOOL_MSG.PROJECT_CONTEXT;
  projectId: string;
  projectName?: string;
  baseUrl: string;
  scenariosRelPath: string;
}

export function toolWebOrigin(tool: ToolRegistryEntry, isDev: boolean): string {
  const port = isDev ? tool.webDevPort : tool.prodPort;
  return `http://127.0.0.1:${port}`;
}

export function toolApiOrigin(tool: ToolRegistryEntry, isDev: boolean): string {
  const port = isDev ? tool.devPort : tool.prodPort;
  return `http://127.0.0.1:${port}`;
}

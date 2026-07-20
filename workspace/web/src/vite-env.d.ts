/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI?: {
    isElectron: boolean;
    saveFile: (defaultName: string, data: ArrayBuffer) => Promise<string | null>;
    openReport: (url: string) => Promise<void>;
    pickFolder: () => Promise<string | null>;
    openExternalTool: (url: string, title?: string) => Promise<void>;
  };
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandle>;
}

export interface ElectronAPI {
  isElectron: true;
  saveFile: (defaultName: string, data: ArrayBuffer) => Promise<string | null>;
  openReport: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

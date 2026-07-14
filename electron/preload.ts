import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  saveFile: (defaultName: string, data: ArrayBuffer) =>
    ipcRenderer.invoke("save-file", defaultName, data) as Promise<string | null>,
  openReport: (url: string) => ipcRenderer.invoke("open-report", url) as Promise<void>,
});

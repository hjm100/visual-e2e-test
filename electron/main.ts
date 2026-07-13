import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
} from "electron";
import { cleanupIfNeeded } from "./installer-cleanup.js";
import { startSidecar, stopSidecar } from "./sidecar.js";
import { openStorageInFileManager, type StorageLayout } from "./storage.js";

const ELECTRON_DIST_DIR = path.dirname(fileURLToPath(import.meta.url));

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let targetUrl = "";
let storageLayout: StorageLayout | null = null;
const reportWindows = new Set<BrowserWindow>();

function preloadPath(): string {
  return path.join(ELECTRON_DIST_DIR, "preload.js");
}

function createMainWindow(url: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    center: true,
    title: "Visual E2E Test",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(url);
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });
  return win;
}

function buildMenu(layout: StorageLayout): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Visual E2E Test",
      submenu: [
        {
          label: "关于 Visual E2E Test",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "关于",
              message: "Visual E2E Test",
              detail: "本地 E2E 测试工作台",
            });
          },
        },
        {
          label: "打开数据目录",
          click: async () => {
            try {
              await openStorageInFileManager(layout);
            } catch (err) {
              console.error("open-data:", err);
            }
          },
        },
        { role: "quit", label: "退出" },
      ],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  return Menu.buildFromTemplate(template);
}

function registerIpc(): void {
  ipcMain.handle("save-file", async (_event, defaultName: string, data: ArrayBuffer) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "保存运行报告",
      defaultPath: path.join(app.getPath("downloads"), defaultName),
      filters: [{ name: "ZIP 压缩包", extensions: ["zip"] }],
    });
    if (canceled || !filePath) return null;
    writeFileSync(filePath, Buffer.from(data));
    return filePath;
  });

  ipcMain.handle("open-report", async (_event, url: string) => {
    const win = new BrowserWindow({
      width: 1280,
      height: 900,
      center: true,
      title: "测试报告",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    reportWindows.add(win);
    win.on("closed", () => reportWindows.delete(win));
    await win.loadURL(url);
  });
}

async function bootstrap(): Promise<void> {
  registerIpc();

  const { layout, baseUrl } = await startSidecar(isDev, process.resourcesPath, app.getPath("userData"));
  storageLayout = layout;
  cleanupIfNeeded(isDev, layout);

  targetUrl = isDev ? "http://localhost:5173" : baseUrl;
  mainWindow = createMainWindow(targetUrl);
  Menu.setApplicationMenu(buildMenu(layout));
}

app.whenReady().then(bootstrap).catch((err) => {
  console.error(err);
  app.exit(1);
});

app.on("before-quit", () => {
  stopSidecar();
  for (const win of reportWindows) {
    if (!win.isDestroyed()) win.destroy();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }
  if (targetUrl && storageLayout) {
    mainWindow = createMainWindow(targetUrl);
    Menu.setApplicationMenu(buildMenu(storageLayout));
  }
});

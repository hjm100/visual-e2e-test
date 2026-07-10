# Visual E2E Test — 桌面客户端（Tauri + Node Sidecar）

Tauri WebView + Node sidecar（Fastify `127.0.0.1`）。

## 架构

```
Tauri (Rust WebView)
  └─ spawn Node sidecar → workspace/server
        ├─ tauri:dev  → 127.0.0.1:3100
        └─ .app       → 127.0.0.1:6100
        ├─ Fastify API + 文件读写
        ├─ Playwright 测试（channel: chrome，使用本机 Chrome）
        └─ 生产模式托管 workspace/web/dist

用户数据（持久化）:
  tauri:dev   macOS: ~/Library/Application Support/visual-e2e-test/Storage/
  .app        macOS: ~/Library/Application Support/com.visual-e2e-test.app/Storage/
  Windows 对应: %APPDATA%/visual-e2e-test/ 与 %APPDATA%/com.visual-e2e-test.app/
    ├── projects/
    └── config/settings.json
```

## 前置条件

| 工具 | 用途 |
|------|------|
| Node.js 20+ | 开发与构建 |
| Rust + Cargo | Tauri 编译（`npm run setup:rust`） |
| macOS: Xcode CLT | WebView / 打包 |
| Windows: WebView2 | 运行时（Win10+ 通常已带） |
| Google Chrome | 运行 E2E 测试（客户端默认 `channel: chrome`） |

macOS 上交叉编译 Windows 安装包还需：

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin
brew install llvm
```

## 运行模式

| 模式 | 启动方式 | `E2E_RUNTIME` | API 端口 | 数据目录 |
|------|----------|---------------|----------|----------|
| Web 开发 | `npm run workspace` | `workspace` | `3101` | 仓库 `projects/`、`config/` |
| 客户端开发 | `npm run tauri:dev` | `client` | `3100` | `visual-e2e-test/Storage/` |
| 生产 | 安装的 `.app` | `client` | `6100` | `com.visual-e2e-test.app/Storage/` |

`/api/health` 的 `runtime` 与 `port` 用于区分当前连的是哪个实例。

### dev 与 build 的差异

| 项 | `tauri:dev` | `tauri:build`（`.app`） |
|----|-------------|-------------------------|
| 代码根 `E2E_ROOT` | 仓库根目录 | `Contents/Resources/app` |
| 用户数据 | `visual-e2e-test/Storage/` | `com.visual-e2e-test.app/Storage/` |
| API 端口 | `3100` | `6100` |
| 前端 | Vite `:5173` | server 静态托管 `web/dist` |
| Node | 系统 PATH 中的 `node` | 包内 `resources/node/{platform}/bin/node` |
| `CLIENT_MODE` | `0` | `1` |

`tauri:dev` 可与已安装的 `.app` 同时运行（端口与 Storage 独立）。

## 开发

### Web 工作台

```bash
npm install
npm run workspace          # Web :5173，API :3101
```

### Tauri 客户端

```bash
npm install
npm run setup:rust         # 首次
source ~/.cargo/env
npm run build:engine       # 生成 dist/cli.js
npm run tauri:dev
```

`tauri dev` 执行 `build:server` 并启动 Vite（`:5173`）。Sidecar 在 `127.0.0.1:3100` 起 API；WebView 加载 Vite，Vite 将 `/api` 代理到 `:3100`。

### 用户数据目录

App 菜单 **Visual E2E Test → 打开数据目录** 打开当前模式对应路径。

```bash
# tauri:dev（macOS）
open ~/Library/Application\ Support/visual-e2e-test/Storage
# .app（macOS）
open ~/Library/Application\ Support/com.visual-e2e-test.app/Storage
```

首次启动时 sidecar 创建 `Storage/projects`、`Storage/config`；若 `config/settings.json` 不存在，从 `E2E_ROOT/config/settings.json` 复制默认配置。

## 打包

```bash
npm run tauri:build:mac    # macOS → build/macos/
npm run tauri:build:win    # Windows → build/windows/
npm run tauri:build:all    # mac + win
npm run tauri:build        # 同 tauri:build:mac
```

流程：同步版本 → 清空 `build/` 对应子目录 → 下载 Node sidecar → `tauri build` → 复制产物。

| 命令 | 产物 |
|------|------|
| `tauri:build:mac` | `build/macos/`（`.app` + `.dmg`） |
| `tauri:build:win` | `build/windows/`（`.exe`；`.msi` 需在 Windows 上构建） |
| `tauri:build:all` | 上述两者（macOS 上 win 为交叉编译） |

Rust 中间产物在 `src-tauri/target/`。

### 包内容

- Tauri WebView
- Node sidecar 二进制
- engine、server、web、scripts、template、node_modules
- 不含 Playwright Chromium（`channel: chrome`）

## 环境变量（Sidecar / 启动脚本）

| 变量 | `workspace` | `tauri:dev` | `.app` |
|------|-------------|-------------|--------|
| `E2E_RUNTIME` | `workspace` | `client` | `client` |
| `WORKSPACE_PORT` | `3101` | `3100` | `6100` |
| `E2E_ROOT` | 仓库根 | 仓库根 | `Resources/app` |
| `PROJECTS_DIR` | `{repo}/projects` | `visual-e2e-test/Storage/projects` | `com.visual-e2e-test.app/Storage/projects` |
| `CONFIG_DIR` | `{repo}/config` | `visual-e2e-test/Storage/config` | `com.visual-e2e-test.app/Storage/config` |
| `SERVE_WEB` | 未设置 | `0` | `1` |
| `CLIENT_MODE` | 未设置 | `0` | `1` |
| `BUNDLED_NODE` | 清除 | 系统 Node | 包内 Node |

## 常见问题

### 运行中心 spawn node ENOENT

- `workspace`：确认 `curl :3101/api/health` 返回 `"runtime":"workspace"`；勿手动设置 `BUNDLED_NODE`。
- `tauri:dev` / `.app`：`.app` 使用包内 `Resources/resources/node/{platform}/bin/node`。

### Rust 工具链

```bash
npm run setup:rust
source ~/.cargo/env
```

### 浏览器启动失败

客户端模式使用 `channel: chrome`，需本机安装 Google Chrome。

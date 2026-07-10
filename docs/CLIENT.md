# Visual E2E Test — 桌面客户端（Tauri + Node Sidecar）

Tauri WebView + Node sidecar（Fastify `127.0.0.1:3100`）。

## 架构

```
Tauri (Rust WebView)
  └─ spawn Node sidecar → workspace/server (127.0.0.1:3100)
        ├─ Fastify API + 文件读写
        ├─ Playwright 测试（channel: chrome，使用本机 Chrome）
        └─ 生产模式托管 workspace/web/dist

用户数据（持久化，重装 App 后保留）:
  macOS:   ~/Library/Application Support/com.visual-e2e-test.app/Storage/
  Windows: %APPDATA%/com.visual-e2e-test.app/Storage/
    ├── projects/
    └── config/settings.json
```

## 前置条件

| 工具 | 用途 |
|------|------|
| Node.js 20+ | 开发与构建 |
| Rust + Cargo | Tauri 编译（[rustup.rs](https://rustup.rs)） |
| macOS: Xcode CLT | WebView / 打包 |
| Windows: WebView2 | 运行时（Win10+ 通常已带） |
| Google Chrome | 运行 E2E 测试（客户端默认 `channel: chrome`） |

## Web 开发

```bash
npm install
npm run workspace          # Web :5173，API :3101
```

`E2E_RUNTIME=workspace`：`projects/`、`config/` 在仓库目录；API 端口 **3101**（与客户端 **3100** 分离，避免与 `.app` 冲突）。

`/api/health` 应返回 `"runtime":"workspace"`、`"port":3101`。

## Tauri 开发

### 首次环境

```bash
npm install
npm run setup:rust         # 安装 Rust toolchain（仅需一次）
source ~/.cargo/env        # 或重启终端
npm run build:engine       # 生成 dist/cli.js
```

### 日常启动

```bash
npm run tauri:dev
```

`tauri dev` 会执行 `build:server`，并启动 Vite（`:5173`）。Sidecar 在 `127.0.0.1:3100` 起 API（`E2E_RUNTIME=client`）；WebView 加载 Vite，Vite 将 `/api` 代理到 `:3100`。

启动前脚本会检查 `:3100` 是否被 workspace 或已安装的 `.app` 占用。

### 运行模式（脚本契约）

| 命令 | `E2E_RUNTIME` | API 端口 | 数据目录 |
|------|---------------|----------|----------|
| `npm run workspace` | `workspace` | `3101` | 仓库 `projects/`、`config/` |
| `npm run tauri:dev` / `.app` | `client` | `3100` | Storage |

### dev 与 build 的差异

| 项 | `tauri:dev` | `tauri:build`（`.app`） |
|----|-------------|-------------------------|
| 代码根 `E2E_ROOT` | 仓库根目录 | `Contents/Resources/app` |
| 用户数据 | Storage（见下） | Storage（同上） |
| 前端 | Vite `:5173` | server 静态托管 `web/dist` |
| Node | 系统 PATH 中的 `node` | 包内 `resources/node/{platform}/bin/node` |
| `CLIENT_MODE` | `0` | `1` |

`tauri:dev` 与 `.app` 共用同一份 Storage（`identifier`: `com.visual-e2e-test.app`）。仓库内 `projects/` 仅 `npm run workspace` 使用。

### 确认当前连的是哪个 server

DevTools → Network → `/api/health`：

- `"runtime":"workspace"`、`"port":3101` → 网页开发 server
- `"runtime":"client"`、仓库 `e2eRoot` → `tauri:dev` sidecar
- `e2eRoot` 含 `.app` → 已安装客户端（网页 dev 不应连到它；workspace 已改用 3101）

### 用户数据目录（Storage）

macOS：

```
~/Library/Application Support/com.visual-e2e-test.app/Storage/
  ├── projects/
  └── config/settings.json
```

Windows：`%APPDATA%/com.visual-e2e-test.app/Storage/`

打开 Storage（macOS）：

```bash
open ~/Library/Application\ Support/com.visual-e2e-test.app/Storage
```

App 菜单 **Visual E2E Test → 打开数据目录** 同样打开上述路径。

首次启动时 sidecar 创建 `Storage/projects`、`Storage/config`；若 `config/settings.json` 不存在，从 `E2E_ROOT/config/settings.json` 复制默认配置。

## 打包

```bash
npm run download:node      # 下载平台 Node 到 src-tauri/resources/node/
npm run tauri:build        # build:client + tauri build
```

产物：`src-tauri/target/release/bundle/`

安装或替换 `/Applications/Visual E2E Test.app` 后启动；数据仍读 Storage，与 `tauri:dev` 一致。

### 包内容

- Tauri WebView
- Node sidecar 二进制
- engine、server、web、scripts、template、node_modules
- 不含 Playwright Chromium（`channel: chrome`）

### 首次启动

Sidecar 初始化 Storage（见「Tauri 开发 → 用户数据目录」）。

## 环境变量（Sidecar / 启动脚本）

| 变量 | `workspace` | `client`（tauri / .app） |
|------|-------------|--------------------------|
| `E2E_RUNTIME` | `workspace` | `client` |
| `WORKSPACE_PORT` | `3101` | `3100` |
| `E2E_ROOT` | 仓库根 | dev: 仓库根；build: `Resources/app` |
| `PROJECTS_DIR` | `{repo}/projects` | `{appData}/Storage/projects` |
| `CONFIG_DIR` | `{repo}/config` | `{appData}/Storage/config` |
| `SERVE_WEB` | 未设置 | dev: `0`；build: `1` |
| `CLIENT_MODE` | 未设置 | dev: `0`；build: `1` |
| `BUNDLED_NODE` | 清除（用 `process.execPath`） | 包内 / 系统 Node 绝对路径 |

## 常见问题

### 运行中心 spawn node ENOENT

- `workspace`：确认 `curl :3101/api/health` 为 `"runtime":"workspace"`；勿手动设置 `BUNDLED_NODE`。
- `tauri:dev` / `.app`：退出占用 `:3100` 的旧 `.app`；重打包后 Node 在 `Resources/resources/node/darwin-arm64/bin/node`。

### Rust / rustup

```bash
npm run setup:rust
```

手动：

```bash
rm -rf ~/.rustup/toolchains/stable-aarch64-apple-darwin
rustup toolchain install stable --profile minimal
rustup default stable
```

`connection reset` 时：

```bash
export RUSTUP_DIST_SERVER=https://rsproxy.cn
export RUSTUP_UPDATE_ROOT=https://rsproxy.cn/rustup
rm -rf ~/.rustup/toolchains/stable-aarch64-apple-darwin
rustup toolchain install stable --profile minimal
rustup default stable
```

`~/.cargo/config.toml`：

```toml
[source.crates-io]
replace-with = "rsproxy"

[source.rsproxy]
registry = "sparse+https://rsproxy.cn/index/"
```

### Rust 未安装

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 浏览器启动失败

客户端模式：`channel: chrome`，不回退 Playwright Chromium。

### 打包缺少产物

```bash
npm run build:client
```

### Windows 安装包

`.msi` 在 Windows 上构建；macOS 产出 `.dmg` / zip。
